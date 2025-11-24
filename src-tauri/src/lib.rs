use enigo::{Enigo, Keyboard, Mouse};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use xcap::Monitor;
use image::ImageFormat;
use base64::{Engine as _, engine::general_purpose};
use tauri::Emitter;

#[derive(Deserialize)]
#[serde(tag = "type", content = "payload")]
enum InputEvent {
    MouseMove { x: i32, y: i32 },
    MouseClick { button: String }, // "left", "right", "middle"
    KeyPress { key: String },
}

#[derive(Serialize, Clone)]
struct MonitorInfo {
    id: u32,
    name: String,
    width: u32,
    height: u32,
    is_primary: bool,
}

// Global state for screen capture
struct CaptureState {
    is_capturing: bool,
    monitor_id: Option<u32>,
}

lazy_static::lazy_static! {
    static ref CAPTURE_STATE: Arc<Mutex<CaptureState>> = Arc::new(Mutex::new(CaptureState {
        is_capturing: false,
        monitor_id: None,
    }));
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn simulate_input(event: InputEvent) {
    println!("Received input event");

    let enigo_result = Enigo::new(&enigo::Settings::default());
    
    match enigo_result {
        Ok(mut enigo) => {
            println!("Enigo initialized successfully");
            match event {
                InputEvent::MouseMove { x, y } => {
                    println!("Moving mouse to: {}, {}", x, y);
                    if let Err(e) = enigo.move_mouse(x, y, enigo::Coordinate::Abs) {
                        println!("Error moving mouse: {:?}", e);
                    }
                }
                InputEvent::MouseClick { button } => {
                    println!("Clicking button: {}", button);
                    let btn = match button.as_str() {
                        "left" => Some(enigo::Button::Left),
                        "right" => Some(enigo::Button::Right),
                        "middle" => Some(enigo::Button::Middle),
                        _ => None,
                    };
                    
                    if let Some(b) = btn {
                        if let Err(e) = enigo.button(b, enigo::Direction::Click) {
                             println!("Error clicking button: {:?}", e);
                        }
                    } else {
                        println!("Unknown button: {}", button);
                    }
                }
                InputEvent::KeyPress { key } => {
                    println!("Typing key: {}", key);
                    if let Err(e) = enigo.text(&key) {
                        println!("Error typing text: {:?}", e);
                    }
                }
            }
        }
        Err(e) => {
            println!("Failed to initialize Enigo: {:?}", e);
        }
    }
}

#[tauri::command]
fn get_monitors() -> Result<Vec<MonitorInfo>, String> {
    println!("Getting monitors list");
    
    let monitors = Monitor::all().map_err(|e| format!("Failed to get monitors: {}", e))?;
    
    let monitor_infos: Vec<MonitorInfo> = monitors
        .iter()
        .enumerate()
        .map(|(idx, monitor)| MonitorInfo {
            id: idx as u32,
            name: monitor.name().to_string(),
            width: monitor.width(),
            height: monitor.height(),
            is_primary: monitor.is_primary(),
        })
        .collect();
    
    println!("Found {} monitors", monitor_infos.len());
    Ok(monitor_infos)
}

#[tauri::command]
async fn start_screen_capture(app: tauri::AppHandle, monitor_id: u32) -> Result<(), String> {
    println!("Starting screen capture for monitor {}", monitor_id);
    
    // Update capture state
    {
        let mut state = CAPTURE_STATE.lock().unwrap();
        if state.is_capturing {
            return Err("Already capturing".to_string());
        }
        state.is_capturing = true;
        state.monitor_id = Some(monitor_id);
    }
    
    // Spawn capture thread
    thread::spawn(move || {
        let monitors = match Monitor::all() {
            Ok(m) => m,
            Err(e) => {
                eprintln!("Failed to get monitors: {}", e);
                return;
            }
        };
        
        let monitor = match monitors.get(monitor_id as usize) {
            Some(m) => m,
            None => {
                eprintln!("Monitor {} not found", monitor_id);
                return;
            }
        };
        
        println!("Capturing monitor: {} ({}x{})", monitor.name(), monitor.width(), monitor.height());
        
        let monitor_width = monitor.width();
        let monitor_height = monitor.height();
        
        // Send monitor info to frontend
        let _ = app.emit("monitor-info", serde_json::json!({
            "width": monitor_width,
            "height": monitor_height
        }));
        
        // Target 15 FPS for better performance
        let frame_duration = Duration::from_millis(66);
        let mut frame_count = 0;
        
        loop {
            // Check if we should stop
            {
                let state = CAPTURE_STATE.lock().unwrap();
                if !state.is_capturing {
                    println!("Stopping capture");
                    break;
                }
            }
            
            let start = std::time::Instant::now();
            
            // Capture frame
            match monitor.capture_image() {
                Ok(image) => {
                    // Convert RGBA to RGB (JPEG doesn't support alpha channel)
                    let rgb_image = image::DynamicImage::ImageRgba8(image).to_rgb8();
                    
                    // Scale down to 720p for better performance
                    let scaled = image::imageops::resize(
                        &rgb_image,
                        1280,
                        720,
                        image::imageops::FilterType::Nearest
                    );
                    
                    // Convert to JPEG with lower quality for better performance
                    let mut buffer = Vec::new();
                    let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buffer, 60);
                    if let Err(e) = scaled.write_with_encoder(encoder) {
                        eprintln!("Failed to encode image: {}", e);
                        continue;
                    }
                    
                    let base64_data = general_purpose::STANDARD.encode(&buffer);
                    
                    // Emit event to frontend
                    if let Err(e) = app.emit("screen-frame", base64_data) {
                        eprintln!("Failed to emit frame: {}", e);
                    } else {
                        frame_count += 1;
                        if frame_count % 15 == 0 {
                            println!("Sent {} frames", frame_count);
                        }
                    }
                }
                Err(e) => {
                    eprintln!("Failed to capture frame: {}", e);
                }
            }
            
            // Maintain frame rate
            let elapsed = start.elapsed();
            if elapsed < frame_duration {
                thread::sleep(frame_duration - elapsed);
            }
        }
    });
    
    Ok(())
}

#[tauri::command]
fn stop_screen_capture() -> Result<(), String> {
    println!("Stopping screen capture");
    
    let mut state = CAPTURE_STATE.lock().unwrap();
    state.is_capturing = false;
    state.monitor_id = None;
    
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            simulate_input,
            get_monitors,
            start_screen_capture,
            stop_screen_capture
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

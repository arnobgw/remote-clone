use enigo::{Enigo, Key, Keyboard, Mouse, Settings, Direction, Button, Coordinate};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(tag = "type", content = "payload")]
enum InputEvent {
    MouseMove { x: i32, y: i32 },
    MouseClick { button: String }, // "left", "right", "middle"
    KeyPress { key: String },
}
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}
#[tauri::command]
fn simulate_input(event: InputEvent) {
    println!("Received input event"); // Trace entry

    // Enigo::new() returns a Result in recent versions
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, simulate_input])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

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
    // Enigo::new() returns a Result in recent versions, so we unwrap it.
    // In a real app, we might want to handle the error more gracefully.
    let mut enigo = Enigo::new(&enigo::Settings::default()).unwrap();

    match event {
        InputEvent::MouseMove { x, y } => {
            // Enigo 0.3+ might use different coordinate system or method names
            // Assuming mouse_move_to is correct for absolute positioning
            let _ = enigo.move_mouse(x, y, enigo::Coordinate::Abs);
        }
        InputEvent::MouseClick { button } => {
            match button.as_str() {
                "left" => { let _ = enigo.button(enigo::Button::Left, enigo::Direction::Click); },
                "right" => { let _ = enigo.button(enigo::Button::Right, enigo::Direction::Click); },
                "middle" => { let _ = enigo.button(enigo::Button::Middle, enigo::Direction::Click); },
                _ => {}
            }
        }
        InputEvent::KeyPress { key } => {
            // key_sequence types a string
            let _ = enigo.text(&key);
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

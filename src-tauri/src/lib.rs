use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Channel {
    pub name: String,
    pub url: String,
    pub logo: Option<String>,
    pub group: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Playlist {
    pub channels: Vec<Channel>,
    pub name: String,
}

fn parse_m3u(content: &str, source_url: Option<&str>) -> Vec<Channel> {
    let mut channels = Vec::new();
    let mut current_name = String::new();
    let mut current_logo: Option<String> = None;
    let mut current_group: Option<String> = None;
    let mut url_index = 0;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("#EXTINF:") {
            if let Some(meta_start) = line.find(',') {
                let meta = &line[8..meta_start];
                current_name = line[meta_start + 1..].to_string();

                if let Some(logo_start) = meta.find("tvg-logo=\"") {
                    let rest = &meta[logo_start + 10..];
                    if let Some(logo_end) = rest.find('"') {
                        current_logo = Some(rest[..logo_end].to_string());
                    }
                }

                if let Some(group_start) = meta.find("group-title=\"") {
                    let rest = &meta[group_start + 13..];
                    if let Some(group_end) = rest.find('"') {
                        current_group = Some(rest[..group_end].to_string());
                    }
                }
            }
        } else if !line.starts_with('#') && !line.is_empty() {
            if !current_name.is_empty() {
                channels.push(Channel {
                    name: current_name.clone(),
                    url: line.to_string(),
                    logo: current_logo.take(),
                    group: current_group.take(),
                });
                current_name.clear();
            } else {
                url_index += 1;
                channels.push(Channel {
                    name: format!("Канал {}", url_index),
                    url: resolve_url(line, source_url),
                    logo: None,
                    group: None,
                });
            }
        }
    }

    if channels.is_empty() {
        if let Some(src) = source_url {
            channels.push(Channel {
                name: src.split('/').last().unwrap_or("Stream").to_string(),
                url: src.to_string(),
                logo: None,
                group: None,
            });
        }
    }

    channels
}

fn resolve_url(url: &str, base: Option<&str>) -> String {
    if url.starts_with("http://") || url.starts_with("https://") {
        return url.to_string();
    }
    if let Some(base_url) = base {
        if let Some(pos) = base_url.rfind('/') {
            let base_path = &base_url[..=pos];
            let url_clean = url.trim_start_matches("./").trim_start_matches('/');
            return format!("{}{}", base_path, url_clean);
        }
    }
    url.to_string()
}

#[tauri::command]
async fn check_url(url: String) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .build()
        .map_err(|e| e.to_string())?;

    let start = std::time::Instant::now();

    match client.head(&url).send().await {
        Ok(response) => {
            let elapsed = start.elapsed().as_millis();
            let status = response.status().as_u16();
            let content_type = response
                .headers()
                .get("content-type")
                .and_then(|v| v.to_str().ok())
                .unwrap_or("unknown")
                .to_string();
            Ok(format!("ok:{}:{}ms:{}", status, elapsed, content_type))
        }
        Err(e) => {
            let elapsed = start.elapsed().as_millis();
            let status = e.status().map(|s| s.as_u16()).unwrap_or(0);
            let kind = if e.is_connect() {
                "connection_refused"
            } else if e.is_timeout() {
                "timeout"
            } else if e.is_status() {
                "http_error"
            } else {
                "unknown"
            };
            Ok(format!("fail:{}:{}ms:{}:{}", status, elapsed, kind, e))
        }
    }
}

#[tauri::command]
async fn detect_and_load(input: String) -> Result<Playlist, String> {
    let trimmed = input.trim();

    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .map_err(|e| e.to_string())?;

        let response = client.get(trimmed).send().await.map_err(|e| e.to_string())?;
        let text = response.text().await.map_err(|e| e.to_string())?;

        if text.contains("#EXTM3U") || text.contains("#EXTINF:") {
            let channels = parse_m3u(&text, Some(trimmed));
            let name = trimmed
                .split('/')
                .last()
                .unwrap_or("playlist")
                .trim_end_matches(".m3u")
                .trim_end_matches(".m3u8")
                .to_string();
            Ok(Playlist { channels, name })
        } else {
            let name = trimmed
                .split('/')
                .last()
                .unwrap_or("stream")
                .to_string();
            Ok(Playlist {
                channels: vec![Channel {
                    name,
                    url: trimmed.to_string(),
                    logo: None,
                    group: None,
                }],
                name: "Прямой эфир".to_string(),
            })
        }
    } else {
        let channels = parse_m3u(trimmed, None);
        if channels.is_empty() {
            Ok(Playlist {
                channels: vec![Channel {
                    name: trimmed.split('/').last().unwrap_or("stream").to_string(),
                    url: trimmed.to_string(),
                    logo: None,
                    group: None,
                }],
                name: "Прямой эфир".to_string(),
            })
        } else {
            Ok(Playlist {
                channels,
                name: "Пользовательский плейлист".to_string(),
            })
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![detect_and_load, check_url])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
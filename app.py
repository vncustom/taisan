import yt_dlp
import sys
import os
import tkinter as tk
from tkinter import ttk, messagebox
import threading

import re

ANSI_ESCAPE = re.compile(r'\x1b\[[0-9;]*m')

class MetaLogger:
    def __init__(self, log_fn):
        self.log_fn = log_fn

    def debug(self, msg):
        self._log(msg)

    def warning(self, msg):
        self._log(f"WARNING: {msg}")

    def error(self, msg):
        self._log(f"ERROR: {msg}")

    def _log(self, msg):
        clean_msg = ANSI_ESCAPE.sub('', msg)
        self.log_fn(clean_msg)
# Hỗ trợ in ký tự Unicode (Tiếng Việt) trên console Windows
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass

class DownloaderGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Python Video Downloader")
        self.root.geometry("600x400")
        
        # URL Input
        self.url_label = ttk.Label(root, text="Nhập URL video:")
        self.url_label.pack(pady=10)
        
        self.url_entry = ttk.Entry(root, width=70)
        self.url_entry.pack(pady=5)
        
        # Quality Selection
        self.quality_label = ttk.Label(root, text="Chọn chất lượng Video:")
        self.quality_label.pack(pady=5)
        
        self.quality_var = tk.StringVar()
        self.quality_combobox = ttk.Combobox(root, textvariable=self.quality_var, state="readonly")
        self.quality_combobox['values'] = ("Best quality", "720p", "360p")
        self.quality_combobox.current(0)
        self.quality_combobox.pack(pady=5)

        # Buttons Frame
        self.btn_frame = ttk.Frame(root)
        self.btn_frame.pack(pady=10)
        
        self.video_btn = ttk.Button(self.btn_frame, text="Tải Video (Best)", command=lambda: self.start_download(False))
        self.video_btn.pack(side=tk.LEFT, padx=5)
        
        self.audio_btn = ttk.Button(self.btn_frame, text="Tải Audio (MP3)", command=lambda: self.start_download(True))
        self.audio_btn.pack(side=tk.LEFT, padx=5)
        
        self.help_btn = ttk.Button(self.btn_frame, text="Web hỗ trợ", command=self.show_supported_sites)
        self.help_btn.pack(side=tk.LEFT, padx=5)
        
        # Status Area
        self.status_label = ttk.Label(root, text="Trạng thái:")
        self.status_label.pack(pady=5)
        
        self.status_text = tk.Text(root, height=10, width=70, state=tk.DISABLED)
        self.status_text.pack(pady=5, padx=10)
        
        self.logger = MetaLogger(self.log_msg)

        # Initialize ffmpeg in background
        self.video_btn.config(state=tk.DISABLED)
        self.audio_btn.config(state=tk.DISABLED)
        self.status_label.config(text="Đang chuẩn bị ffmpeg...")
        
        ffmpeg_thread = threading.Thread(target=self.init_ffmpeg)
        ffmpeg_thread.daemon = True
        ffmpeg_thread.start()

    def init_ffmpeg(self):
        try:
            import static_ffmpeg
            static_ffmpeg.add_paths()
        except Exception as _e:
            self.log_msg(f"Warning: could not load static-ffmpeg: {_e}")
        finally:
            self.root.after(0, self.finish_init_ffmpeg)
            
    def finish_init_ffmpeg(self):
        self.status_label.config(text="Trạng thái:")
        self.video_btn.config(state=tk.NORMAL)
        self.audio_btn.config(state=tk.NORMAL)

    def show_supported_sites(self):
        sites_info = """Dưới đây là danh sách một số nền tảng phổ biến được hỗ trợ:

• Mạng xã hội: YouTube, Facebook, Instagram (Reels/Stories), TikTok, Reddit, Twitter (X), LinkedIn.

• Video Hosting: Vimeo, Dailymotion, Twitch (VODs and Clips), Bilibili.

• Giải trí & Tin tức: BBC iPlayer, CNN, Fox News, Discovery+.

• Giáo dục/Nghề nghiệp: TED, Khan Academy, Udemy, Coursera.

• Âm nhạc/Âm thanh: SoundCloud, Bandcamp, Mixcloud.

Và hàng ngàn trang web khác hỗ trợ bởi yt-dlp!"""
        messagebox.showinfo("Các trang web được hỗ trợ", sites_info)

    def start_download(self, is_audio):
        url = self.url_entry.get().strip()
        if not url:
            messagebox.showwarning("Cảnh báo", "Vui lòng nhập URL!")
            return
            
        quality = self.quality_var.get()
        
        self.video_btn.config(state=tk.DISABLED)
        self.audio_btn.config(state=tk.DISABLED)
        
        # Chạy trong thread mới để không làm treo GUI
        thread = threading.Thread(target=self.download_process, args=(url, is_audio, quality))
        thread.daemon = True
        self.download_thread = thread
        thread.start()

    def download_process(self, url, is_audio, quality):
        # Template đặt tên file bao gồm chất lượng để tránh trùng tên
        outtmpl = '%(title).100s [%(height)sp].%(ext)s' if not is_audio else '%(title).100s.%(ext)s'
        
        ydl_opts = {
            'logger': self.logger,
            'outtmpl': outtmpl,
            'noplaylist': True,
            'merge_output_format': 'mp4',  # Đảm bảo đầu ra là mp4
        }

        # ffmpeg/ffprobe are on PATH via static_ffmpeg.add_paths() called at startup
        
        if is_audio:
            ydl_opts.update({
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }],
            })
        else:
            if quality == "720p":
                # Ưu tiên mp4[height<=720] và m4a audio
                ydl_opts['format'] = 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best'
            elif quality == "360p":
                # Ưu tiên mp4[height<=360] và m4a audio
                ydl_opts['format'] = 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best'
            else:
                # Ưu tiên mp4 chất lượng tốt nhất
                ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                self.log_msg(f"--- Bắt đầu tải {'Audio' if is_audio else 'Video'} ({quality if not is_audio else 'MP3'}) ---")
                ydl.download([url])
                self.log_msg(f"--- Hoàn tất tải! ---")
                self.root.after(0, lambda: messagebox.showinfo("Thành công", "Tải về hoàn tất!"))
        except Exception as e:
            self.log_msg(f"Lỗi: {str(e)}")
            self.root.after(0, lambda e=e: messagebox.showerror("Lỗi", f"Có lỗi xảy ra: {str(e)}"))
        finally:
            self.root.after(0, lambda: self.video_btn.config(state=tk.NORMAL))
            self.root.after(0, lambda: self.audio_btn.config(state=tk.NORMAL))

    def log_msg(self, msg):
        self.status_text.after(0, self._do_log, msg)

    def _do_log(self, msg):
        self.status_text.config(state=tk.NORMAL)
        self.status_text.insert(tk.END, msg + "\n")
        self.status_text.see(tk.END)
        self.status_text.config(state=tk.DISABLED)

if __name__ == "__main__":
    # Nỗ lực giữ lại CLI nếu có URL truyền vào, nếu không thì mở GUI
    if len(sys.argv) > 1:
        # Giữ lại hàm cũ cho CLI
        def download_video_cli(url, is_audio=False):
            try:
                import static_ffmpeg
                static_ffmpeg.add_paths()
            except Exception as _e:
                print(f"Warning: could not load static-ffmpeg: {_e}")

            ydl_opts = {'format': 'best' if not is_audio else 'bestaudio/best', 'outtmpl': '%(title).100s.%(ext)s'}
            if is_audio:
                ydl_opts['postprocessors'] = [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '192',
                }]
            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([url])
            except Exception as e:
                print(f"Error: {e}")
                sys.exit(1)
        
        is_audio = '--audio' in sys.argv
        url_args = [arg for arg in sys.argv[1:] if not arg.startswith('--')]
        if url_args:
            download_video_cli(url_args[0], is_audio=is_audio)
        else:
            print("Error: No URL provided.")
            sys.exit(1)
    else:
        root = tk.Tk()
        app = DownloaderGUI(root)
        root.mainloop()

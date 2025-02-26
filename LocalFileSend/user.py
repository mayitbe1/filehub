# user.py
import tkinter as tk
from tkinter import filedialog, messagebox
from discovery import discovered_devices, discovery_lock, start_discovery
from filetrans import send_file
import threading

def create_gui():
    root = tk.Tk()
    root.title("LocalSend")

    # 创建一个标签用于显示选中的设备名称
    selected_device_label = tk.Label(root, text="No device selected", fg="gray")
    selected_device_label.pack(pady=5)

    # 创建设备列表
    tk.Label(root, text="Select a device to send files to:").pack(pady=10)

    # 添加滚动条
    scrollbar = tk.Scrollbar(root, orient="vertical")
    device_list = tk.Listbox(root, width=50, height=15, yscrollcommand=scrollbar.set)
    device_list.pack(side="left", fill="both", expand=True, pady=10)
    scrollbar.config(command=device_list.yview)
    scrollbar.pack(side="right", fill="y")

    # 更新设备列表
    def update_device_list():
        with discovery_lock:
            device_list.delete(0, tk.END)
            for ip, hostname in discovered_devices.items():
                device_list.insert(tk.END, f"{hostname} ({ip})")
        root.after(5000, update_device_list)

    update_device_list()

    # 更新选中的设备名称
    def update_selected_device(event):
        selected_indices = device_list.curselection()
        if selected_indices:
            selected_index = selected_indices[0]
            selected_device_info = device_list.get(selected_index)
            selected_device_label.config(text=f"Selected device: {selected_device_info}", fg="black")
        else:
            selected_device_label.config(text="No device selected", fg="gray")

    # 绑定选中事件
    device_list.bind("<<ListboxSelect>>", update_selected_device)

    # 选择文件并发送
    def select_and_send_file():
        file_path = filedialog.askopenfilename()
        if file_path:
            try:
                selected_indices = device_list.curselection()
                if not selected_indices:
                    raise ValueError("No device selected.")
                selected_index = selected_indices[0]
                selected_device_info = device_list.get(selected_index)
                _, ip = selected_device_info.split(" (")
                ip = ip[:-1]  # Remove the closing parenthesis
                print(f"Sending file to {ip}...")
                send_file(file_path, ip)
                messagebox.showinfo("Success", "File sent successfully!")
            except Exception as e:
                messagebox.showerror("Error", f"Please select a device first. Error: {e}")

    tk.Button(root, text="Send File", command=select_and_send_file).pack(pady=10)
    root.mainloop()

def start_receiver():
    from filetrans import receive_file
    receive_file()

if __name__ == "__main__":
    # 启动设备发现
    start_discovery()

    # 启动接收功能（在后台线程中运行）
    receiver_thread = threading.Thread(target=start_receiver, daemon=True)
    receiver_thread.start()

    # 创建用户界面
    create_gui()
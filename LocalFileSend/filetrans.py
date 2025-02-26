# filetrans.py
import socket
import os

def send_file(file_path, target_ip, port=12346):
    """发送文件到指定设备"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.connect((target_ip, port))
            with open(file_path, "rb") as file:
                while True:
                    data = file.read(4096)
                    if not data:
                        break
                    sock.sendall(data)
        print(f"File sent to {target_ip}:{port}")
    except Exception as e:
        print(f"Failed to send file: {e}")

def receive_file(port=12346):
    """接收文件"""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.bind(("", port))
            sock.listen()
            print(f"Waiting for incoming files on port {port}...")
            conn, addr = sock.accept()
            with conn:
                with open("received_file", "wb") as file:
                    while True:
                        data = conn.recv(4096)
                        if not data:
                            break
                        file.write(data)
                print(f"File received from {addr[0]}:{addr[1]}")
    except Exception as e:
        print(f"Failed to receive file: {e}")
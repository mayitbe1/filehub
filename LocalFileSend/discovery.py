# discovery.py
import socket
import threading
import time

# 广播地址和端口
BROADCAST_ADDR = "255.255.255.255"
PORT = 12345

# 用于存储发现的设备
discovered_devices = {}
discovery_lock = threading.Lock()

def broadcast_device_info():
    """广播设备信息"""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        hostname = socket.gethostname()
        message = f"{hostname}|{socket.gethostbyname(socket.gethostname())}".encode()
        while True:
            sock.sendto(message, (BROADCAST_ADDR, PORT))
            with discovery_lock:
                print(f"Broadcasting device info to {BROADCAST_ADDR}:{PORT}")
            time.sleep(5)

def listen_for_devices():
    """监听其他设备的广播信息"""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.bind(("", PORT))
        while True:
            data, addr = sock.recvfrom(1024)
            hostname, ip = data.decode().split("|")
            with discovery_lock:
                if ip not in discovered_devices:
                    discovered_devices[ip] = hostname
                    print(f"New device found: {hostname} ({ip})")

def start_discovery():
    """启动设备发现"""
    threading.Thread(target=broadcast_device_info, daemon=True).start()
    threading.Thread(target=listen_for_devices, daemon=True).start()
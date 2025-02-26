# LocalFileSend Module

- This module implements file transfer functionality within a local network, supporting automatic device discovery, file sending, and receiving. It is an essential part of the FileHub project, aiming to provide a simple, secure, and efficient file-sharing solution.

  #### **Implementation Approach**

  1. **Device Discovery**:
     - Use broadcast or multicast mechanisms to automatically discover other devices within the local network.
     - Each device broadcasts its presence upon startup and listens for broadcasts from other devices.
     - Device information (including device name and IP address) is stored and displayed in the user interface.
  2. **File Sending**:
     - Users can select a target device and choose a file to send through the graphical interface.
     - Files are sent to the target device via TCP connection, supporting large file transfers.
  3. **File Receiving**:
     - Start a receiving service to listen on a specified port and receive files from other devices.
     - Received files are saved to a designated path.

  #### **Technologies Used**

  - **Python**: The entire module is implemented using the Python programming language.
  - **Socket**: Python's `socket` module is used for network communication, including broadcasting and TCP connections.
  - **Tkinter**: Tkinter is used to create the graphical user interface, providing device selection and file sending functionality.
  - **Threading**: Multithreading is used to ensure that device discovery, file sending, and receiving functions can run simultaneously.

  #### **Module Structure**

  ```
  LocalFileSend/
  ├── discovery.py       # Device discovery module
  ├── filetrans.py       # File transfer module
  └── user.py            # User interface module
  ```

  #### **Module Features**

  1. **Device Discovery**:
     - Automatically discovers devices within the local network and displays their names and IP addresses.
     - Supports dynamic updates to the device list.
  2. **File Sending**:
     - Users can select a target device and send files.
     - Supports large file transfers, with file transfer progress viewable via console output.
  3. **File Receiving**:
     - Runs a receiving service in the background, listening on a specified port.
     - Received files are saved to the current directory where the program is running.

  #### **How to Run**

  1. **Start the Receiving Service**:

     bash

     ```bash
     python filetrans.py receive --port 12346
     ```

     - Ensure the receiving service is running and listening on the port.

  2. **Start the User Interface**:

     bash

     ```bash
     python user.py
     ```

     - The device list will automatically update, showing discovered devices.
     - Users can select a target device and send files.

  #### **Notes**

  - **Firewall Settings**: Ensure that the firewall on the target device allows communication on port `12346`.
  - **Network Connection**: Ensure that the sender and receiver are on the same local network.
  - **File Save Path**: Received files are saved to the current directory where the program is running. You can modify the code to specify a specific save path.

  #### **Module Limitations**

  - The current implementation does not encrypt file transfers, so it is recommended to use it within a secure local network.
  - Device names default to hostnames, but users can customize device names to better distinguish devices.
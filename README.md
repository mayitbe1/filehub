<div>
 

<h1> Filehub: Secure File Management & Sharing Platform</h1>

   <div>
     A comprehensive solution for secure file management, digital signatures, integrity verification, and seamless file sharing across networks.
    </div>
</div>

## 📋 <a name="table">Table of Contents</a>

1. 🤖 [Introduction](#introduction)
2. ⚙️ [Tech Stack](#tech-stack)
3. 🔋 [Features](#features)
4. 🤸 [Quick Start](#quick-start)


## <a name="introduction">🤖 Introduction</a>

FileHub is an advanced file management platform that combines security and efficiency. It offers digital signature capabilities, integrity verification, LAN file transfer, and comprehensive file management features. Built with the latest Next.js 15 and utilizing modern cryptographic techniques, FileHub ensures your files remain secure while being easily accessible and shareable.



## <a name="tech-stack">⚙️ Tech Stack</a>

- React 19
- Next.js 15
- Appwrite
- TailwindCSS
- ShadCN
- TypeScript
- WebRTC (for peer-to-peer file transfers)


## <a name="features">🔋 Features</a>

👉 **Digital Signatures**: Securely sign files with cryptographic signatures to verify authenticity and prevent tampering, ensuring document integrity and non-repudiation.

👉 **Integrity Verification**: Verify file integrity through checksums and hash verification, ensuring files haven't been modified during transfer or storage.

👉 **LAN File Transfer**: Transfer files directly between devices on the same network using WebRTC technology, enabling fast and secure peer-to-peer file sharing without internet dependency.

👉 **User Authentication**: Implement secure signup, login, and logout functionality using Appwrite's authentication system.

👉 **File Uploads & Management**: Effortlessly upload, organize, and manage a variety of file types, including documents, images, videos, and audio files.

👉 **View and Manage Files**: Browse through uploaded files stored in secure storage, view on a new tab, rename files or delete them as needed.

👉 **Download Files**: Download uploaded files with integrity verification, giving instant access to essential documents.

👉 **File Sharing**: Easily share uploaded files with others through secure channels, enabling collaboration and controlled access to important content.

👉 **Dashboard**: Gain insights at a glance with a dynamic dashboard that showcases total and consumed storage, recent uploads, and a summary of files grouped by type.

👉 **Global Search**: Quickly find files and shared content across the platform with a robust global search feature.

👉 **Sorting Options**: Organize files efficiently by sorting them by date, name, or size, making file management a breeze.

👉 **Modern Responsive Design**: A fresh and minimalist UI that emphasizes usability, ensuring a clean aesthetic across all devices.

## <a name="quick-start">🤸 Quick Start</a>

Follow these steps to set up the project locally on your machine.

**Prerequisites**

Make sure you have the following installed on your machine:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en)
- [npm](https://www.npmjs.com/) (Node Package Manager)

**Cloning the Repository**

```bash
git clone https://github.com/mayitbe1/filehub.git
cd filehub
```

**Installation**

Install the project dependencies using npm:

```bash
npm install
```

**Set Up Environment Variables**

Create a new file named `.env.local` in the root of your project and add the following content:

```env
NEXT_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
NEXT_PUBLIC_APPWRITE_PROJECT=""
NEXT_PUBLIC_APPWRITE_DATABASE=""
NEXT_PUBLIC_APPWRITE_USERS_COLLECTION=""
NEXT_PUBLIC_APPWRITE_FILES_COLLECTION=""
NEXT_PUBLIC_APPWRITE_BUCKET=""
NEXT_APPWRITE_KEY=""
```

Replace the values with your actual Appwrite credentials. You can obtain these credentials by signing up &
creating a new project on the [Appwrite website](https://appwrite.io/).

**Running the Project**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the project.

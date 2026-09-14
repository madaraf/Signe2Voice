
# Sign2Vision

A bidirectional web application designed to facilitate seamless communication between deaf/non-verbal individuals and hearing individuals. Built with a robust Python/Flask backend and an intuitive Neo-Brutalist frontend interface, the platform bridges communication gaps through two primary operational modes:

*   **Voice Mode:** Captures spoken language and transcribes it into real-time, readable text for deaf and hard-of-hearing users. Includes localization support for Arabic (Algeria) [ar-DZ].
*   **Sign Mode:** Utilizes client-side computer vision to capture sign language gestures, mapping hand landmarks in real-time and translating them into readable text for individuals who do not know sign language.

## Application Demo



https://github.com/user-attachments/assets/5260e25a-8e98-402e-8ed7-15c8016a8af6



## System Architecture

The application operates on a client-server model optimized for low-latency local network access, ensuring rapid translation processing across multiple devices.

*   **Backend:** Python 3.12 with Flask. Manages network routing, dynamic local IP resolution, and serves the static frontend assets.
*   **Frontend:** HTML5, CSS3, and Vanilla JavaScript, styled with high-contrast, accessible UI components.
*   **Computer Vision:** Integrates hand-tracking models to map skeletal landmarks over live video feeds for gesture classification.
*   **Network:** Binds to `0.0.0.0` to allow cross-device LAN access via dynamic local IP socket resolution.

## Core Features

*   **Real-Time Hand Tracking:** Visualizes skeletal hand landmarks during Sign Mode to ensure the user is positioned correctly for the AI prediction model.
*   **Gesture Recognition Vocabulary:** Currently supports predictions for standard gestures including: *HELLO, STOP, YES, NO, PEACE, FIST, ONE-FIVE, CALL ME, OK*.
*   **Live Transcript History:** Maintains a running log of translated phrases (e.g., "السلام عليكم", "مرحبا", "حسنا") during active sessions.
*   **Audio Feedback Levels:** Real-time decibel monitoring during Voice Mode to verify microphone input quality.

## Local Development Setup

### Prerequisites
* Python 3.12+
* Git

### Installation Steps
To run this project locally, you will need a Google Gemini API key.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/madaraf/Signe2Voice.git](https://github.com/madaraf/Signe2Voice.git)
   cd Signe2Voice



2. **Initialize a virtual environment:**
```bash
python3 -m venv venv
source venv/bin/activate

```


3. **Install dependencies:**
```bash
pip install flask python-dotenv
npm install
# Add any additional machine learning libraries required (e.g., mediapipe, opencv-python)

```
4. **Set up environment variables:**
   * Create a new file named `.env` in the root directory of the project.
   * Copy the contents of `.env.example` into your new `.env` file.
   * Get an API key from [Google AI Studio](https://aistudio.google.com/).
   * Replace `your_google_api_key_here` in the `.env` file with your actual API key.

   Your `.env` file should look like this:
   ```env
   GOOGLE_API_KEY="AIzaSy..."
   ```

5. **Run the local server:**
```bash
python3 server.py

```


6. **Access the application:**
* **Local Machine:** `http://127.0.0.1:5000`
* **Mobile/LAN Device:** The terminal will output your dynamic local IPv4 address (e.g., `http://192.168.X.X:5000`).



## Technical Roadmap

Future iterations of this project will focus on scaling the backend architecture and optimizing the machine learning pipelines:

* **Expanded NLP Pipeline:** Utilizing natural language processing to normalize transcribed text, handle complex Arabic conversational context, and optimize prompts for bidirectional translations.
* **Microservices Architecture:** Refactoring the Flask monolith into a RESTful API to decouple the speech-to-text and computer vision microservices from the client interface, establishing enterprise-grade code quality.
* **Continuous Learning:** Implementing feedback loops to improve gesture prediction accuracy on custom datasets.

```

Once the file is saved and the `1122.mp4` video is placed in your project folder, run these commands in your VS Code terminal to upload them to your repository:

```bash
git add README.md 1122.mp4
git commit -m "docs: Add full README documentation and video demo"
git push

```

# Contributing to Spin the Wheel - Discord Activity

Thank you for your interest in contributing to **Spin the Wheel - Discord Activity**!

Before contributing, please read these guidelines carefully.

---

## ⚖️ Important Legal & Licensing Notice

This project is governed by a **Commercial and Attribution License** (see [`LICENSE`](LICENSE)). It is **NOT** open source under permissive terms (such as MIT or Apache).

All intellectual property rights are reserved by the authors (**Sayan** & **Vedant**).

Contributions do **NOT** grant any ownership, distribution, or commercial rights over the project.

By submitting an issue or pull request, you explicitly agree that:

* Your contribution becomes part of this project.
* The authors retain exclusive ownership and copyright over all contributed code and assets.
* You do not acquire any rights to resell, sublicense, or commercially exploit this project.

---

## 🛠️ Development Setup

The project consists of a high-performance **Client-Server Discord Activity architecture**:
* **Frontend**: Vanilla JavaScript (ES Modules), HTML5 Canvas 2D engine, CSS3 glassmorphic design, Vite, and `@discord/embedded-app-sdk`.
* **Backend**: Node.js (ES Modules), Express, Socket.IO, `node-fetch`, and `dotenv`.

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* **Discord Developer Account**: For testing within the Discord client

### Local Setup Steps

1. **Fork the repository** on GitHub (or clone directly).
2. **Clone the repository**:
   ```bash
   git clone https://github.com/nexcoder-dev/Spin-the-Wheel-Discord-Activity.git
   cd Spin-the-Wheel-Discord-Activity
   ```

3. **Install dependencies**:
   ```bash
   # Install client dependencies
   cd client
   npm install

   # Install server dependencies
   cd ../server
   npm install
   cd ..
   ```

4. **Configure Environment Variables**:
   Copy `example.env` to `.env` in the project root:
   ```bash
   cp example.env .env
   ```
   Fill in your Discord application credentials:
   ```env
   VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
   DISCORD_CLIENT_SECRET=your_discord_client_secret_here
   PORT=3001
   ```

5. **Start Development Servers**:
   Open two terminals:

   * **Terminal 1 (Backend Server)**:
     ```bash
     cd server
     npm run dev
     ```
     The server will start on `http://localhost:3001`.

   * **Terminal 2 (Frontend Client)**:
     ```bash
     cd client
     npm run dev
     ```
     The Vite dev server will start on `http://localhost:5173`.

6. **Run Server Tests**:
   ```bash
   cd server
   npm test
   ```

7. **Verify Client Production Build**:
   ```bash
   cd client
   npm run build
   ```

---

## 🔄 How to Submit Changes

1. Create a feature or bugfix branch with a descriptive name:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-description
   ```
2. Make your changes adhering to the [Coding Standards](#-coding--design-standards).
3. Verify your changes pass all unit tests and build cleanly:
   ```bash
   # Run backend tests
   cd server && npm test

   # Verify frontend build
   cd ../client && npm run build
   ```
4. Commit your changes with clear, semantic commit messages:
   ```bash
   git commit -m "feat(giveaway): add celebration sound effects on winner draw"
   ```
5. Push to your branch and open a **Pull Request (PR)** against the `main` branch.

---

## 📐 Coding & Design Standards

To preserve code quality, visual appeal, and real-time reliability:

* **Server-Authoritative Synchronization**:
  * Spin angles, winning segment calculation, and giveaway elimination must always be computed and validated by the backend (`WheelEngine.js`, `RoomManager.js`).
  * Never allow client-side manipulation of winning segments or giveaway states.

* **Canvas & Animation Performance**:
  * Keep wheel animations silky smooth (60/120 FPS) using `requestAnimationFrame`.
  * Ensure crisp canvas rendering on Retina and high-DPI displays by using `devicePixelRatio`.

* **Visual Aesthetic**:
  * Maintain the sleek modern dark mode, ambient particle glow, and glassmorphic cards.
  * Ensure full responsiveness across Discord desktop, web, and mobile viewport overlays.

* **Audio & Audio Synthesis**:
  * Use the Web Audio API for ticking sounds, wheel spin acoustics, and fanfare celebratory chords.
  * Ensure user audio controls (mute/unmute) are always honored.

* **Security**:
  * Never commit `.env` files, Discord Client Secrets, OAuth tokens, or sensitive credentials.

---

## 🐛 Bug Reports

If you encounter a bug, please open a GitHub Issue including:

* **Summary**: A concise description of the bug.
* **Environment**: Discord Desktop / Web / Mobile, OS version, Node.js version.
* **Steps to Reproduce**: Clear, numbered steps to reproduce the issue.
* **Expected vs. Actual Behavior**: What should happen versus what actually happened.
* **Console Logs**: Relevant client browser console or backend terminal logs.
* **Screenshots / Recordings**: Visual evidence if the issue relates to UI rendering, wheel spin desync, or animations.

---

## 💡 Feature Requests

Feature ideas that enhance the **Spin the Wheel Discord Activity** experience are welcome!

When proposing a feature:
* Clearly explain the use case (e.g. new giveaway modes, custom audio presets, special wheel effects).
* Describe how it impacts host and participant interactions in Discord voice channels.
* Keep in mind that approval and implementation of feature proposals are at the sole discretion of the author.

---

## 🤝 Code of Conduct

* Be respectful, collaborative, and constructive in all discussions, issues, and pull requests.
* Harassment, hate speech, trolling, or toxic behavior will result in an immediate block and removal from collaboration.

---

## 📬 Contact & Licensing Inquiries

For commercial licensing, partnerships, or private inquiries:
* **Sayan** — *Backend Developer* | GitHub: [@nexcoder-dev](https://github.com/nexcoder-dev) | Email: [gsa339402@gmail.com](mailto:gsa339402@gmail.com)
* **Vedant** — *Frontend Developer* | GitHub: [@Vedant08-code-ai](https://github.com/Vedant08-code-ai) | Email: [vedantmaslekar26@gmail.com](mailto:vedantmaslekar26@gmail.com)

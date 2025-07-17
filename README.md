# Forecast360

# 🌦️ Weather Prediction Web Application

A full-stack weather prediction web application built with **React (TypeScript)** on the frontend and **Firebase Authentication** for user login. It integrates mapping and user interface components to provide location-based weather insights.

---

## 🔍 Project Structure

```

weather\_prediction/
├── frontend/
│   ├── src/
│   │   ├── App.tsx          # Main routing and authentication handling
│   │   ├── main.tsx         # React app entry point
│   │   ├── pages/           # Contains Home and Dashboard views
│   │   ├── components/
│   │   │   └── Auth.tsx     # Authentication logic (login/signup)
│   │   └── firebase/
│   │       └── config.ts    # Firebase authentication config
│   ├── public/              # Static assets
│   ├── node\_modules/        # React dependencies
│   ├── package.json         # Project dependencies and scripts
│   └── index.css            # Global styles

````

---

## 🚀 Features

- 🌐 Routing with React Router DOM
- 🔐 Firebase-based Authentication (login/signup with session persistence)
- 📍 Map-based location selection for weather lookup
- 📈 Real-time weather prediction results (presumably powered via external API or backend model)
- 📊 Dashboard visualization for predicted results
- ⚡ Responsive design using Tailwind CSS
- 💡 Context-aware conditional rendering (based on auth state)

---

## 🧠 How It Works

- **App.tsx** handles all routing. It uses Firebase's `onAuthStateChanged` method to watch for authentication state changes.
- Routes:
  - `/` → Home page (open to all)
  - `/auth` → Login/Signup page (for guests)
  - `/dashboard` → Protected page (only for logged-in users)
- **main.tsx** is the entry point where the app is bootstrapped using React 18’s `createRoot()` API.

---

## 🛠️ Tech Stack

### Frontend
- ⚛️ React (with TypeScript)
- 🌐 React Router DOM for navigation
- 🎨 Tailwind CSS for responsive UI
- 🔥 Firebase Authentication for secure login
- 🗺️ Lucide React for icon support
- ⚡ Vite for fast development and build

### Dev Tools & Utilities
- ESLint & Prettier (presumed from modern stack structure)
- Vite plugin support (via Tailwind, Lucide, etc.)

---

## 🔧 Setup Instructions

1. **Install Dependencies**
   ```bash
   cd weather_prediction/frontend
   npm install

2. **Configure Firebase**

   * Create a Firebase project at [firebase.google.com](https://firebase.google.com)
   * Copy your web app config into `frontend/src/firebase/config.ts`

3. **Run the App**

   ```bash
   npm run dev
   ```

4. Open your browser at `http://localhost:3000`

---

## 🛡️ Protected Routing Example

```tsx
<Route path="/dashboard" element={user ? <Dashboard /> : <Auth />} />
```

Users cannot access the dashboard unless authenticated.

---

## 📁 Explore Further

* `src/pages/Dashboard.tsx` – Weather display logic
* `src/components/ui/MapPicker.tsx` – Interactive location selection

---

## 🤝 Contributing

Contributions are welcome! Feel free to fork this repository, make improvements, and submit a pull request. Whether it's bug fixes, performance enhancements, or new features, all help is appreciated.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgements

- [React](https://reactjs.org/)
- [Firebase](https://firebase.google.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

---

## 📬 Contact

If you have any questions, feedback, or suggestions, feel free to reach out:

- 📧 Email: samyukthajaggaiahgari22@gmail.com
---

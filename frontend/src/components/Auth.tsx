import { auth, googleProvider, githubProvider } from "../firebase/config";
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User 
} from "firebase/auth";
import { useState, useEffect } from "react";
import { FcGoogle } from "react-icons/fc";
import { FaGithub } from "react-icons/fa";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [user, setUser] = useState<User | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  // ✅ Listen for authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ✅ Google Sign-In
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser(result.user);
      navigate("/Dashboard");
    } catch (error) {
      console.error("Google Sign-In Error:", error);
    }
  };

  // ✅ GitHub Sign-In
  const signInWithGitHub = async () => {
    try {
      const result = await signInWithPopup(auth, githubProvider);
      setUser(result.user);
      navigate("/Dashboard");
    } catch (error) {
      console.error("GitHub Sign-In Error:", error);
    }
  };

  // ✅ Logout function
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      navigate("/");
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <div className="absolute top-4 right-4 flex items-center">
      {user ? (
        <div className="relative">
          <img
            src={user.photoURL || "/default-profile.png"}
            alt="Profile"
            className="w-10 h-10 rounded-full cursor-pointer border border-gray-300"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          />
          {dropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 bg-white shadow-lg rounded-lg p-3 w-32"
            >
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100 rounded"
              >
                Logout
              </button>
            </motion.div>
          )}
        </div>
      ) : (
        <div className="flex space-x-3">
          <button onClick={signInWithGoogle} className="bg-blue-500 text-white px-4 py-2 rounded flex items-center">
            <FcGoogle className="mr-2" size={20} /> Login
          </button>
          <button onClick={signInWithGitHub} className="bg-gray-800 text-white px-4 py-2 rounded flex items-center">
            <FaGithub className="mr-2" size={20} /> Login
          </button>
        </div>
      )}
    </div>
  );
}
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { Toaster, toast } from 'react-hot-toast'

const Header = () => {
  const { user, signInWithGoogle, signOut, loading } = useAuth()

  const handleSignIn = async () => {
    try {
      const response = await signInWithGoogle()
      // Toast will be shown after successful redirect and auth state change
    } catch (error) {
      toast.error('Failed to sign in')
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Successfully signed out!')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 p-4 z-10 backdrop-blur-sm bg-gray-900/50">
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#1f2937',
          color: '#fff',
        },
        success: {
          iconTheme: {
            primary: '#a855f7',
            secondary: '#fff',
          },
        },
      }} />
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-purple-600 text-transparent bg-clip-text">YouTube Downloader</h1>
        <AnimatePresence mode="wait">
          <motion.div 
            className="flex items-center gap-4"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}>
          {loading ? (
            <div className="flex items-center gap-2">
              <motion.div
                className="w-4 h-4 rounded-full bg-purple-600"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.5, 1]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <span className="text-white text-sm">Loading...</span>
            </div>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full blur group-hover:blur-md transition-all duration-300"></div>
                <img
                  src={user.user_metadata?.avatar_url}
                  alt="Profile"
                  className="relative w-10 h-10 rounded-full border-2 border-white/20"
                />
              </div>
              <span className="text-white font-medium">{user.user_metadata?.full_name}</span>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-600/90 backdrop-blur-sm text-white font-medium rounded-lg shadow-[2px_2px_0px_0px_rgba(220,38,38,0.4)] hover:shadow-[4px_4px_0px_0px_rgba(220,38,38,0.4)] transition-all duration-300 hover:bg-red-700"
              >
                Sign Out
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSignIn}
              className="px-6 py-2 bg-purple-600/90 backdrop-blur-sm text-white font-medium rounded-lg shadow-[2px_2px_0px_0px_rgba(168,85,247,0.4)] hover:shadow-[4px_4px_0px_0px_rgba(168,85,247,0.4)] transition-all duration-300 hover:bg-purple-700"
            >
              Sign in with Google
            </motion.button>
          )}
          </motion.div>
        </AnimatePresence>
      </div>
    </header>
  )
}

export default Header
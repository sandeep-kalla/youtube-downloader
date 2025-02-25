import { useState } from 'react'
import { motion } from 'framer-motion'
import axios from 'axios'
import P5Background from './components/P5Background'
import Header from './components/Header'
import { useAuth } from './context/AuthContext'

const App = () => {
  const { user, credits, signInWithGoogle } = useAuth()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [videoInfo, setVideoInfo] = useState(null)
  const [error, setError] = useState('')
  const [expiryTime, setExpiryTime] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if user has credits or is logged in
    if (!credits && !user) {
      setError('Please sign in with Google to continue using the tool')
      return
    }
    
    setLoading(true)
    setError('')
    setVideoInfo(null)
    setExpiryTime(null)

    try {
      const response = await axios.post('http://localhost:5000/get-formats', { url })
      setVideoInfo(response.data)
    } catch (err) {
      setError('Failed to fetch video information. Please check the URL.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async (formatId) => {
    setDownloadLoading(true);
    try {
      const response = await axios.post('http://localhost:5000/download', {
        url,
        format_id: formatId
      });
      
      const downloadUrl = response.data.downloadUrl;
      
      // Set expiry time if provided
      if (response.data.expiresIn) {
        setExpiryTime(response.data.expiresIn);
      }
      
      // Instead of creating a link element, redirect the window to the download URL
      // This approach ensures the browser's download behavior is triggered
      window.location.href = downloadUrl;
      
      // We'll set downloadComplete after a delay since the page will navigate
      setTimeout(() => {
        setDownloadLoading(false);
        setVideoInfo({
          ...videoInfo,
          downloadComplete: true
        });
      }, 1000);
      
      return; // Early return to prevent setting downloadLoading to false immediately
    } catch (err) {
      setError('Download failed. Please try again.');
      console.error(err);
    }
    
    setDownloadLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-24 px-8 pb-8">
      <P5Background />
      <Header />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto"
      >
        <div className="backdrop-blur-md bg-white/10 p-8 rounded-2xl shadow-lg border border-white/20 hover:border-white/40 transition-colors">
          <h1 className="text-6xl font-black mb-8 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
            YouTube Downloader
          </h1>

          {!user && credits === 0 ? (
            <div className="text-center mb-8">
              <p className="text-white mb-4">You&apos;ve used your free credit. Sign in to continue using the tool!</p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={signInWithGoogle}
                className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(168,85,247,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(168,85,247,0.4)] transition-shadow hover:bg-purple-700"
              >
                Sign in with Google
              </motion.button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mb-8">
              <div className="flex gap-4">
                <motion.input
                  whileFocus={{ scale: 1.02 }}
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste YouTube URL here..."
                  className="flex-1 p-4 border-4 border-purple-500 rounded-lg bg-gray-800 text-white placeholder-gray-400 shadow-[4px_4px_0px_0px_rgba(168,85,247,0.4)] focus:shadow-[6px_6px_0px_0px_rgba(168,85,247,0.4)] transition-shadow outline-none"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="px-8 py-4 bg-purple-600 text-white font-bold rounded-lg shadow-[4px_4px_0px_0px_rgba(168,85,247,0.4)] hover:shadow-[6px_6px_0px_0px_rgba(168,85,247,0.4)] transition-shadow hover:bg-purple-700"
                >
                  Fetch
                </motion.button>
              </div>
            </form>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 bg-red-500 text-white rounded-lg mb-8"
            >
              {error}
            </motion.div>
          )}

          {loading && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              className="mb-8"
            >
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-600"
                  initial={{ width: '0%' }}
                  animate={{
                    width: '100%',
                    transition: { duration: 1.5, repeat: Infinity }
                  }}
                />
              </div>
              <p className="text-center text-white mt-2">Fetching video information...</p>
            </motion.div>
          )}

          {downloadLoading && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: '100%' }}
              className="mb-8"
            >
              <div className="h-2 w-full bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-400 to-purple-600"
                  initial={{ width: '0%' }}
                  animate={{
                    width: '100%',
                    transition: { duration: 2, repeat: Infinity }
                  }}
                />
              </div>
              <p className="text-center text-white mt-2">Downloading video...</p>
            </motion.div>
          )}

          {videoInfo && !videoInfo.downloadComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gray-800 p-6 rounded-lg shadow-lg"
            >
              <h2 className="text-2xl font-bold text-white mb-4">{videoInfo.title}</h2>
              <div className="relative">
                <select
                  onChange={(e) => handleDownload(e.target.value)}
                  disabled={downloadLoading}
                  className="w-full p-4 bg-purple-600/80 backdrop-blur-sm text-white rounded-lg appearance-none cursor-pointer hover:bg-purple-700/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
                  style={{ direction: 'ltr' }}
                >
                  <option value="" className="bg-gray-800 text-white py-2">Select Format</option>
                  
                  {/* Video with Audio Section */}
                  {videoInfo.formats.some(f => f.type === 'video') && (
                    <optgroup label="Video with Audio" className="bg-gray-800 font-bold">
                      {videoInfo.formats
                        .filter(format => format.type === 'video')
                        .map((format) => (
                          <option 
                            key={format.format_id} 
                            value={format.format_id}
                            className="bg-gray-800/90 text-white py-2"
                          >
                            {format.resolution} ({format.ext}) - {format.filesize}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  
                  {/* Audio Only Section */}
                  {videoInfo.formats.some(f => f.type === 'audio') && (
                    <optgroup label="Audio Only" className="bg-gray-800 font-bold">
                      {videoInfo.formats
                        .filter(format => format.type === 'audio')
                        .map((format) => (
                          <option 
                            key={format.format_id} 
                            value={format.format_id}
                            className="bg-gray-800/90 text-white py-2"
                          >
                            {format.ext.toUpperCase()} Audio - {format.filesize}
                          </option>
                        ))}
                    </optgroup>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </motion.div>
          )}
          
          {videoInfo?.downloadComplete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center p-4 bg-gray-800 rounded-lg mb-8"
            >
              <div className="text-green-500 font-bold mb-2">
                Download complete! Check your downloads folder.
              </div>
              
              {expiryTime && (
                <div className="text-yellow-400 text-sm">
                  ⚠️ Note: This download link will expire in {expiryTime} minutes
                </div>
              )}
            </motion.div>
          )}

          {!user && credits > 0 && (
            <div className="fixed bottom-4 right-4 bg-gray-800 p-4 rounded-lg shadow-lg">
              <p className="text-white">Credits remaining: {credits}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default App
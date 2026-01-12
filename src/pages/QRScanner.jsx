import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { attendanceService, employeeService } from '../services/api'
import { toast } from 'react-toastify'

const QRScanner = () => {
  const [scanning, setScanning] = useState(false)
  const [lastScan, setLastScan] = useState(null)
  const [showCamera, setShowCamera] = useState(false)
  const [pendingMatricule, setPendingMatricule] = useState(null)
  const [recentScans, setRecentScans] = useState([])
  const [stats, setStats] = useState({ present: 0, absent: 0, total: 0, averageHours: 0 })
  const [manualInput, setManualInput] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('online')
  const [scanAnimation, setScanAnimation] = useState(false)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const scannerRef = useRef(null)

  // Charger les scans récents et statistiques
  const loadTodayData = async () => {
    try {
      const today = new Date()
      const response = await attendanceService.getAll({
        startDate: today.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      })
      
      const todayAttendance = response.data || []
      setRecentScans(todayAttendance.slice(0, 10)) // Derniers 10 scans
      
      // Calculer les statistiques
      const present = todayAttendance.filter(att => att.heureArrivee).length
      const completed = todayAttendance.filter(att => att.heureArrivee && att.heureDepart).length
      const totalEmployees = todayAttendance.length
      
      // Calculer la moyenne des heures
      const totalHours = todayAttendance
        .filter(att => att.heuresTotales)
        .reduce((sum, att) => sum + parseFloat(att.heuresTotales || 0), 0)
      const averageHours = completed > 0 ? (totalHours / completed).toFixed(1) : 0
      
      setStats({
        present,
        completed,
        total: totalEmployees,
        averageHours
      })
      
      setConnectionStatus('online')
    } catch (error) {
      setConnectionStatus('offline')
      console.error('Erreur lors du chargement des données:', error)
    }
  }

  // Vérifier le statut de connexion
  const checkConnection = async () => {
    try {
      await attendanceService.getAll({ startDate: new Date().toISOString().split('T')[0] })
      setConnectionStatus('online')
    } catch (error) {
      setConnectionStatus('offline')
    }
  }

  useEffect(() => {
    loadTodayData()
    checkConnection()
    
    // Rafraîchir les données toutes les 30 secondes
    const interval = setInterval(() => {
      loadTodayData()
      checkConnection()
    }, 30000)

    return () => {
      clearInterval(interval)
      if (scannerRef.current) {
        scannerRef.current.clear()
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  const startScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        qrbox: { width: 250, height: 250 },
        fps: 5
      },
      false
    )

    scanner.render(
      async (decodedText) => {
        try {
          setScanAnimation(true)
          setTimeout(() => setScanAnimation(false), 1000)
          
          // Vérifier si c'est un check-in ou check-out
          const today = new Date()
          const response = await attendanceService.getAll({
            startDate: today.toISOString().split('T')[0],
            endDate: today.toISOString().split('T')[0]
          })
          
          const todayAttendance = response.data.find(
            att => att.matricule === decodedText
          )

          if (todayAttendance && todayAttendance.heureDepart) {
            toast.info('Pointage déjà complet pour aujourd\'hui')
            scanner.clear()
            setScanning(false)
            return
          }

          // Si arrivée enregistrée mais pas de départ, vérifier l'heure
          if (todayAttendance && todayAttendance.heureArrivee && !todayAttendance.heureDepart) {
            const now = new Date()
            const currentHour = now.getHours()
            
            // Bloquer le scan jusqu'à 17h (5 PM)
            if (currentHour < 17) {
              const hoursUntilDeparture = 17 - currentHour
              toast.warning(`Le scanner est bloqué jusqu'à 17h. Il reste ${hoursUntilDeparture}h avant de pouvoir signaler votre départ. Utilisez le bouton "Signaler mon départ" dans la page de présence.`)
              scanner.clear()
              setScanning(false)
              return
            }
            
            // Après 17h, permettre le check-out
            const result = await attendanceService.checkOut(decodedText)
            toast.success(`Départ enregistré pour ${result.data.nom}`)
            setLastScan({ type: 'checkout', data: result.data })
          } else if (todayAttendance) {
            // Check-out (cas où heureArrivee existe mais heureDepart aussi - ne devrait pas arriver)
            const result = await attendanceService.checkOut(decodedText)
            toast.success(`Départ enregistré pour ${result.data.nom}`)
            setLastScan({ type: 'checkout', data: result.data })
          } else {
            // Check-in -> open camera modal to capture photo before sending
            scanner.clear()
            setScanning(false)
            setPendingMatricule(decodedText)
            setShowCamera(true)
            return
          }

          scanner.clear()
          setScanning(false)
          await loadTodayData() // Rafraîchir les données
        } catch (error) {
          toast.error(error.response?.data?.message || 'Erreur lors du pointage')
          scanner.clear()
          setScanning(false)
        }
      },
      (errorMessage) => {
        // Erreur ignorée silencieusement pendant le scan
      }
    )

    scannerRef.current = scanner
    setScanning(true)
  }

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setScanning(false)
  }

  useEffect(() => {
    // Start/stop camera when modal opens/closes
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
      } catch (err) {
        toast.error('Impossible d\'accéder à la caméra : autorisation refusée')
        setShowCamera(false)
        setPendingMatricule(null)
      }
    }

    if (showCamera) startCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
    }
  }, [showCamera])

  const captureAndSend = async () => {
    try {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas) throw new Error('Caméra indisponible')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)

      // stop camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }

      setShowCamera(false)
      // send check-in with photo and timestamp
      const payload = { matricule: pendingMatricule, photo: dataUrl, photoTimestamp: new Date().toISOString() }
      const result = await attendanceService.checkIn(payload)
      toast.success(`Arrivée enregistrée pour ${result.data.nom}`)
      setLastScan({ type: 'checkin', data: result.data })
      setPendingMatricule(null)
      await loadTodayData() // Rafraîchir les données
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la capture / envoi')
      setShowCamera(false)
      setPendingMatricule(null)
    }
  }

  // Gérer la saisie manuelle
  const handleManualSubmit = async (e) => {
    e.preventDefault()
    if (!manualInput.trim()) {
      toast.error('Veuillez saisir un matricule')
      return
    }

    try {
      setScanAnimation(true)
      setTimeout(() => setScanAnimation(false), 1000)

      // Vérifier si l'employé existe
      const employee = await employeeService.getByMatricule(manualInput.trim())
      if (!employee.data) {
        toast.error('Matricule non trouvé')
        return
      }

      // Vérifier si c'est un check-in ou check-out
      const today = new Date()
      const response = await attendanceService.getAll({
        startDate: today.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      })
      
      const todayAttendance = response.data.find(
        att => att.matricule === manualInput.trim()
      )

      if (todayAttendance && todayAttendance.heureDepart) {
        toast.info('Pointage déjà complet pour aujourd\'hui')
        setManualInput('')
        return
      }

      // Si arrivée enregistrée mais pas de départ, vérifier l'heure
      if (todayAttendance && todayAttendance.heureArrivee && !todayAttendance.heureDepart) {
        const now = new Date()
        const currentHour = now.getHours()
        
        // Bloquer le scan jusqu'à 17h (5 PM)
        if (currentHour < 17) {
          const hoursUntilDeparture = 17 - currentHour
          toast.warning(`Le scanner est bloqué jusqu'à 17h. Il reste ${hoursUntilDeparture}h avant de pouvoir signaler votre départ. Utilisez le bouton "Signaler mon départ" dans la page de présence.`)
          setManualInput('')
          return
        }
        
        // Après 17h, permettre le check-out
        const result = await attendanceService.checkOut(manualInput.trim())
        toast.success(`Départ enregistré pour ${result.data.nom}`)
        setLastScan({ type: 'checkout', data: result.data })
      } else if (todayAttendance) {
        // Check-out
        const result = await attendanceService.checkOut(manualInput.trim())
        toast.success(`Départ enregistré pour ${result.data.nom}`)
        setLastScan({ type: 'checkout', data: result.data })
      } else {
        // Check-in -> open camera modal
        setPendingMatricule(manualInput.trim())
        setShowCamera(true)
      }

      setManualInput('')
      setShowManualInput(false)
      await loadTodayData()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors du pointage')
    }
  }

  const cancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setShowCamera(false)
    setPendingMatricule(null)
    // resume scanner if needed
    if (!scanning) startScan()
  }

  return (
    <div className="relative min-h-screen w-full">
      {/* Image d'arrière-plan */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?w=1920&q=80)',
          backgroundPosition: 'center center',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          zIndex: 0
        }}
      >
        <div className="absolute inset-0 w-full h-full bg-black/30"></div>
      </div>

      {/* Contenu */}
      <div className="relative z-10 min-h-screen w-full p-6 sm:p-8">
      {/* En-tête avec image de fond professionnelle */}
      <div className="mb-8 relative overflow-hidden rounded-2xl shadow-2xl">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1618005198919-d3d4b5a92eee?w=1200&q=80)',
            backgroundPosition: 'center',
            backgroundSize: 'cover'
          }}
        >
          <div className="absolute inset-0 bg-black/55"></div>
        </div>
        <div className="relative z-10 p-8 sm:p-12">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-6">
              <div className="flex-shrink-0">
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-bold text-white mb-3 drop-shadow-lg">Scanner QR Code</h1>
                <p className="text-white/90 text-base sm:text-lg">Scannez les codes QR pour enregistrer les présences</p>
              </div>
            </div>
            {/* Indicateur de statut */}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg border border-white/20">
              <div className={`w-2 h-2 rounded-full ${connectionStatus === 'online' ? 'bg-green-400' : 'bg-red-400'} animate-pulse`}></div>
              <span className="text-white text-sm font-medium">
                {connectionStatus === 'online' ? 'En ligne' : 'Hors ligne'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques en temps réel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-blue-500">
          <div className="text-sm text-gray-600 mb-1">Présents</div>
          <div className="text-2xl font-bold text-gray-900">{stats.present}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-green-500">
          <div className="text-sm text-gray-600 mb-1">Complets</div>
          <div className="text-2xl font-bold text-gray-900">{stats.completed}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-purple-500">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4 border-l-4 border-orange-500">
          <div className="text-sm text-gray-600 mb-1">Moy. heures</div>
          <div className="text-2xl font-bold text-gray-900">{stats.averageHours}h</div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-center gap-3 mb-4 flex-wrap">
          {!scanning ? (
            <button
              onClick={startScan}
              className="bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
            >
              Démarrer le scan
            </button>
          ) : (
            <button
              onClick={stopScan}
              className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
            >
              Arrêter le scan
            </button>
          )}
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl font-semibold text-sm"
          >
            {showManualInput ? 'Masquer' : 'Saisie manuelle'}
          </button>
        </div>

        {/* Saisie manuelle */}
        {showManualInput && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Entrez le matricule"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all font-semibold"
              >
                Valider
              </button>
            </form>
          </div>
        )}
        
        {/* Animation de scan réussi */}
        {scanAnimation && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-green-500 text-white px-8 py-4 rounded-lg shadow-2xl text-xl font-bold animate-pulse">
              ✓ Scan réussi !
            </div>
          </div>
        )}
        
        <div id="qr-reader" className="flex justify-center"></div>
      </div>

      {/* Camera modal for photo on check-in */}
      {showCamera && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Prendre une photo pour l'arrivée</h2>
            <p className="text-sm text-gray-600 mb-3">Matricule: {pendingMatricule}</p>
            <div className="flex flex-col items-center gap-4">
              <video ref={videoRef} className="w-full rounded" playsInline />
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <div className="w-full flex justify-between">
                <button onClick={cancelCamera} className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200">Annuler</button>
                <button onClick={captureAndSend} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Prendre la photo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dernier scan */}
      {lastScan && (
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {lastScan.type === 'checkin' ? '✅ Arrivée enregistrée' : '✅ Départ enregistré'}
          </h2>
          <div className="space-y-2 text-gray-700">
            <p><strong className="text-gray-900">Nom:</strong> {lastScan.data.nom}</p>
            <p><strong className="text-gray-900">Matricule:</strong> {lastScan.data.matricule}</p>
            <p><strong className="text-gray-900">Heure:</strong> {new Date(lastScan.data[lastScan.type === 'checkin' ? 'heureArrivee' : 'heureDepart']).toLocaleString('fr-FR')}</p>
            {lastScan.data.heuresTotales && (
              <p><strong className="text-gray-900">Heures totales:</strong> {lastScan.data.heuresTotales}h</p>
            )}
          </div>
        </div>
      )}

      {/* Historique des scans récents */}
      {recentScans.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Scans récents (aujourd'hui)</h2>
            <button
              onClick={loadTodayData}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              🔄 Actualiser
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Nom</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Matricule</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Arrivée</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Départ</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Heures</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Statut</th>
                </tr>
              </thead>
              <tbody>
                {recentScans.map((scan, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-gray-900">{scan.employee?.nom || scan.nom || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{scan.employee?.matricule || scan.matricule || 'N/A'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {scan.heureArrivee ? new Date(scan.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {scan.heureDepart ? new Date(scan.heureDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {scan.heuresTotales ? `${scan.heuresTotales}h` : '-'}
                    </td>
                    <td className="py-3 px-4">
                      {scan.heureArrivee && scan.heureDepart ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Complet
                        </span>
                      ) : scan.heureArrivee ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          En cours
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          Absent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {recentScans.length === 0 && (
            <p className="text-center text-gray-500 py-8">Aucun scan aujourd'hui</p>
          )}
        </div>
      )}
      </div>
    </div>
  )
}

export default QRScanner


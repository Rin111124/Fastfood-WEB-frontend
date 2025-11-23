import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { getToken } from '../lib/session'

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

/**
 * Custom hook for Socket.IO connection
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoConnect - Auto connect on mount (default: true)
 * @param {string[]} options.roles - Only connect for specific roles
 * @returns {Object} Socket instance and connection state
 */
export const useSocket = (options = {}) => {
    const { autoConnect = true, roles = [] } = options
    const [connected, setConnected] = useState(false)
    const [error, setError] = useState(null)
    const socketRef = useRef(null)

    useEffect(() => {
        if (!autoConnect) return

        const token = getToken()
        if (!token) {
            setError('No authentication token')
            return
        }

        // Create socket connection
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        })

        socketRef.current = socket

        socket.on('connect', () => {
            console.log('✅ Socket connected:', socket.id)
            setConnected(true)
            setError(null)
        })

        socket.on('disconnect', (reason) => {
            console.log('❌ Socket disconnected:', reason)
            setConnected(false)
        })

        socket.on('connect_error', (err) => {
            console.error('Socket connection error:', err)
            setError(err.message)
            setConnected(false)
        })

        // Cleanup on unmount
        return () => {
            if (socket) {
                console.log('🔌 Disconnecting socket')
                socket.disconnect()
            }
        }
    }, [autoConnect])

    return {
        socket: socketRef.current,
        connected,
        error
    }
}

/**
 * Hook to listen for socket events
 * @param {string} event - Event name
 * @param {Function} handler - Event handler
 * @param {Object} socket - Socket instance
 */
export const useSocketEvent = (event, handler, socket) => {
    useEffect(() => {
        if (!socket || !event || !handler) return

        socket.on(event, handler)

        return () => {
            socket.off(event, handler)
        }
    }, [event, handler, socket])
}

/**
 * Hook to emit socket events
 * @param {Object} socket - Socket instance
 * @returns {Function} Emit function
 */
export const useSocketEmit = (socket) => {
    return (event, data) => {
        if (socket && socket.connected) {
            socket.emit(event, data)
        }
    }
}

export default useSocket

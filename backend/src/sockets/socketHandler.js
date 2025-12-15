// src/sockets/socketHandler.js

module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log(`⚡ User connected: ${socket.id} (User ID: ${socket.user.id})`)

        // Join Personal Room
        const personalRoom = `user_${socket.user.id}`
        socket.join(personalRoom)
        console.log(`   -> Joined room: ${personalRoom}`)

        // Handle Disconnect
        socket.on('disconnect', () => {
            console.log(`User disconnected: ${socket.id}`)
        })
        
        // ถ้าอนาคตมี Chat หรือ Event อื่นๆ ก็เขียนเพิ่มในนี้
        // socket.on('send_message', (msg) => { ... })
    })
}
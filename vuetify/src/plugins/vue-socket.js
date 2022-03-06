import Vue from 'vue'
import VueSocketIO from 'vue-socket.io'
// import SocketIO from 'socket.io-client'

Vue.use(new VueSocketIO({
    debug: (process.env.NODE_ENV === 'development'),
    connection: process.env.VUE_APP_API_BASE_URL,
}));
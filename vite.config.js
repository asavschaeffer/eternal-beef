import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                mission: resolve(__dirname, 'pages/mission.html'),
                skateLessons: resolve(__dirname, 'pages/skate-lessons.html'),
                bikeProgram: resolve(__dirname, 'pages/bike-program.html'),
                skateHouses: resolve(__dirname, 'pages/skate-houses.html'),
                communityServices: resolve(__dirname, 'pages/community-services.html'),
                yamoInterviews: resolve(__dirname, 'pages/yamo-interviews.html'),
            }
        }
    }
})

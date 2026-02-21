/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./frontend/**/*.{html,js}"],
    theme: {
        extend: {
            animation: {
                'comet-spin': 'comet-spin 4s linear infinite',
            },
            keyframes: {
                'comet-spin': {
                    '0%': { transform: 'rotate(0deg)' },
                    '100%': { transform: 'rotate(360deg)' },
                }
            }
        },
    },
    plugins: [],
}

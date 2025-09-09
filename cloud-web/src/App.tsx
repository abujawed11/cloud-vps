

// import './styles/globals.css'

// function App() {


//   return (
//     <>
//       <h1 className="min-h-screen bg-background text-text antialiased">
//         Hello world!
//       </h1>

//     </>
//   )
// }

// export default App



import Providers from "@/app/providers"
import AppRouter from "@/app/router"

export default function App() {
  return (
    <Providers>
      <AppRouter />
    </Providers>
  )
}


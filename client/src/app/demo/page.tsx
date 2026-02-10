import Link from "next/link";

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-900 text-white font-sans p-8">
      
      {/* Header with Back Link */}
      <header className="mb-12">
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors">
          &larr; Back to Home
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Morphed Image (Now on the left and larger) */}
        <div className="order-2 md:order-1">
           <div style={{ viewTransitionName: 'hero-image' }} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gradient-to-bl from-purple-600 to-blue-500 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center text-white/20 text-9xl font-black">
                16
              </div>
           </div>
        </div>

        {/* Morphed Title (Now on the right and smaller/different context) */}
        <div className="flex flex-col gap-6 order-1 md:order-2">
          <div style={{ viewTransitionName: 'hero-title' }}>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Seamless <span className="text-purple-400">Transitions</span>
            </h1>
          </div>
          
          <p className="text-lg text-zinc-300">
            Notice how the title and the gradient box morphed from the previous page? 
            This is powered by the <strong>View Transitions API</strong>, now natively supported in Next.js 16 via the experimental flag.
          </p>

          <div className="p-6 bg-zinc-800 rounded-xl border border-zinc-700">
            <h3 className="font-semibold mb-2 text-purple-300">How it works</h3>
            <code className="text-sm text-zinc-400 block mb-4">
              style={{'{'}} viewTransitionName: 'hero-title' {{'}'}}
            </code>
            <p className="text-sm text-zinc-400">
              Assigning a unique <code>viewTransitionName</code> to elements on both pages tells the browser to animate between them automatically during navigation.
            </p>
          </div>
        </div>

      </main>
    </div>
  );
}

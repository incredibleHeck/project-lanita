import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 font-sans dark:bg-black p-8">
      <main className="flex w-full max-w-5xl flex-col items-center justify-between gap-12 sm:flex-row">
        
        {/* Left Content */}
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <div style={{ viewTransitionName: 'hero-title' }}>
            <h1 className="text-4xl font-bold tracking-tight text-black dark:text-zinc-50 sm:text-6xl">
              Next.js 16 <span className="text-blue-600">Power</span>
            </h1>
          </div>
          
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Experience bleeding-edge features like <code>proxy.ts</code> and native <strong>View Transitions</strong>.
          </p>

          <div className="flex gap-4">
            <Link
              href="/demo"
              className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-all"
            >
              Start View Transition Demo &rarr;
            </Link>
            <a
              href="https://nextjs.org/blog/next-16"
              target="_blank"
              className="rounded-full bg-white/10 px-6 py-3 text-sm font-semibold text-black dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              Read Docs
            </a>
          </div>
        </div>

        {/* Right Content (Hero Image) */}
        <div className="relative aspect-square w-full max-w-md sm:w-[400px]">
           <div style={{ viewTransitionName: 'hero-image' }} className="relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-600 shadow-2xl">
              <div className="absolute inset-0 flex items-center justify-center text-white/20 text-9xl font-black">
                16
              </div>
           </div>
        </div>

      </main>
    </div>
  );
}
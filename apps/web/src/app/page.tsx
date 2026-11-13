'use client'
import AnimatedCharacter from './play/SkinMenu/AnimatedCharacter'
import Link from 'next/link'
import {
  ArrowRight,
  CloudArrowUp,
  GithubLogo,
  LinkSimple,
  MapTrifold,
  Sparkle,
  UsersThree,
  VideoCamera,
  WifiSlash,
} from '@phosphor-icons/react'
import { isOfflineMode } from '@/utils/offline/config'

const features = [
  {
    icon: MapTrifold,
    title: 'Design your realm',
    description:
      'Lay out rooms tile by tile, with spawn points, private areas and teleporters that connect the whole map.',
  },
  {
    icon: LinkSimple,
    title: 'Share with a link',
    description:
      'Invite people with a share link and decide whether a realm is open to everyone or owner-only.',
  },
  {
    icon: UsersThree,
    title: 'Move together',
    description:
      'Live presence and proximity chat make every corner of the map feel occupied — walk up and start talking.',
  },
  {
    icon: CloudArrowUp,
    title: 'Yours to run',
    description:
      'Supabase in production or a fully local offline mode for development, with the same codebase.',
  },
]

const GITHUB_URL = 'https://github.com/HFFICEFREE/CompHub'

export default function Index() {
  const offline = isOfflineMode()

  return (
    <div className='gradient relative min-h-screen overflow-hidden'>
      <div aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full bg-quaternary/10 blur-3xl' />
        <div className='absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-light-secondary/20 blur-3xl' />
      </div>

      <main className='relative mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-12'>
        <header className='flex items-center justify-between gap-4'>
          <Link href='/' className='flex items-center gap-3'>
            <span className='grid h-10 w-10 place-items-center rounded-xl bg-quaternary text-lg font-bold text-button'>
              C
            </span>
            <span>
              <span className='block text-lg font-semibold leading-none'>CompHub</span>
              <span className='block text-xs text-white/50'>collaborative virtual spaces</span>
            </span>
          </Link>

          <a
            href={GITHUB_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-white/70 transition-colors hover:border-quaternary/40 hover:text-white'
          >
            <GithubLogo className='h-4 w-4' /> GitHub
          </a>
        </header>

        <div className='mt-16 grid items-center gap-12 lg:mt-20 lg:grid-cols-[1.1fr_0.9fr]'>
          <div>
            <span className='inline-flex items-center gap-2 rounded-full border border-quaternary/30 bg-quaternary/10 px-3 py-1 text-xs font-medium text-quaternary'>
              {offline ? (
                <WifiSlash className='h-3.5 w-3.5' weight='bold' />
              ) : (
                <Sparkle className='h-3.5 w-3.5' weight='fill' />
              )}
              {offline ? 'Offline workspace · local data' : 'Realms · presence · video'}
            </span>

            <h1 className='mt-6 text-4xl font-semibold leading-tight sm:text-5xl'>
              A place for your team to meet, build and hang out.
            </h1>

            <p className='mt-5 max-w-xl text-lg leading-relaxed text-white/70'>
              CompHub is a collaborative virtual space. Design your own realm, invite people with a
              link and move around together in real time — with proximity chat, video and a map
              editor built in.
            </p>

            <div className='mt-8 flex flex-wrap items-center gap-5'>
              <Link
                href={offline ? '/signin' : '/app'}
                className='inline-flex items-center gap-2 rounded-lg bg-quaternary px-6 py-4 text-sm font-semibold text-button transition-colors duration-300 hover:bg-quaternaryhover'
              >
                {offline ? 'Enter offline workspace' : 'Get started'}
                <ArrowRight className='h-4 w-4' />
              </Link>

              <a
                href={GITHUB_URL}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-2 text-sm font-semibold text-white/70 underline-offset-4 transition-colors hover:text-white hover:underline'
              >
                <GithubLogo className='h-4 w-4' /> View the source
              </a>
            </div>

            <p className='mt-4 text-xs text-white/40'>
              {offline
                ? 'Offline mode: no Supabase, no Google. Realms are stored locally in .offline/data.json.'
                : 'Runs in the browser. Sign in with Google, or use the offline workspace for local development.'}
            </p>
          </div>

          <div className='relative mx-auto w-full max-w-md'>
            <div aria-hidden className='absolute -inset-6 rounded-[2.5rem] bg-quaternary/10 blur-2xl' />

            <div className='relative overflow-hidden rounded-3xl border border-white/10 bg-darkblue/80 p-6 shadow-2xl backdrop-blur'>
              <div className='flex items-center justify-between text-xs text-white/60'>
                <span className='inline-flex items-center gap-2'>
                  <span className='h-2 w-2 animate-pulse rounded-full bg-quaternary' /> Live now
                </span>
                <span className='font-mono text-[11px] text-white/40'>realm · lobby</span>
              </div>

              <div className='relative my-6 grid place-items-center rounded-2xl border border-white/5 bg-[radial-gradient(circle_at_center,rgba(6,214,160,0.18),transparent_65%)] py-10'>
                <span className='absolute left-4 top-4 rounded-full bg-secondary/80 px-3 py-1 text-xs text-white/80'>
                  3 online
                </span>
                <AnimatedCharacter src='/sprites/characters/Character_009.png' className='w-52' />
                <span className='absolute bottom-4 right-4 inline-flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-xs text-white/80'>
                  <VideoCamera className='h-3.5 w-3.5' /> video room
                </span>
              </div>

              <div className='grid grid-cols-3 gap-2 text-center text-[11px] text-white/70'>
                <div className='rounded-lg bg-white/5 px-2 py-2'>Lobby</div>
                <div className='rounded-lg bg-white/5 px-2 py-2'>Studio</div>
                <div className='rounded-lg bg-white/5 px-2 py-2'>Lounge</div>
              </div>
            </div>
          </div>
        </div>

        <section className='mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className='rounded-2xl border border-white/10 bg-secondary/40 p-5 backdrop-blur transition-colors hover:border-quaternary/40 hover:bg-secondary/60'
            >
              <Icon className='h-6 w-6 text-quaternary' weight='duotone' />
              <h2 className='mt-4 font-semibold'>{title}</h2>
              <p className='mt-2 text-sm leading-relaxed text-white/60'>{description}</p>
            </div>
          ))}
        </section>

        <footer className='mt-16 flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row sm:items-center'>
          <p>CompHub — collaborative virtual spaces.</p>
          <p>Next.js · NestJS · Supabase · Socket.io</p>
        </footer>
      </main>
    </div>
  )
}

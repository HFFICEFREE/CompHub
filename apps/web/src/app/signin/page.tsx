'use client'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { isOfflineMode } from '@/utils/offline/config'
import GoogleSignInButton from './GoogleSignInButton'

export default function Login() {

    const offline = isOfflineMode()

    const signIn = async () => {
        const supabase = createClient()
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: process.env.NEXT_PUBLIC_BASE_URL + '/auth/callback'
            }
        })
    }

  return (
    <div className='gradient relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6 py-16'>
        <div aria-hidden className='pointer-events-none absolute inset-0 overflow-hidden'>
            <div className='absolute -top-32 right-1/4 h-96 w-96 rounded-full bg-quaternary/10 blur-3xl' />
            <div className='absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-light-secondary/20 blur-3xl' />
        </div>

        <div className='relative w-full max-w-md rounded-3xl border border-white/10 bg-secondary/40 p-8 text-center shadow-2xl backdrop-blur'>
            <Link href='/' className='inline-flex items-center gap-3'>
                <span className='grid h-11 w-11 place-items-center rounded-xl bg-quaternary text-lg font-bold text-button'>
                    C
                </span>
                <span className='text-left'>
                    <span className='block text-lg font-semibold leading-none'>CompHub</span>
                    <span className='block text-xs text-white/50'>collaborative virtual spaces</span>
                </span>
            </Link>

            <h1 className='mt-8 text-2xl font-semibold'>Sign in to your spaces</h1>
            <p className='mt-2 text-sm leading-relaxed text-white/60'>
                {offline
                    ? 'No Supabase, no Google: this local workspace keeps everything in .offline/data.json.'
                    : 'Use your Google account to open your realms and join your team.'}
            </p>

            <div className='mt-8 flex justify-center'>
                {offline ? (
                    <button
                        className='flex h-16 w-64 items-center justify-center rounded-md bg-white p-2 text-lg text-black transition-opacity duration-300 ease-in-out hover:opacity-70'
                        onClick={signIn}
                    >
                        Enter offline workspace
                    </button>
                ) : (
                    <GoogleSignInButton onClick={signIn}/>
                )}
            </div>

            <p className='mt-6 text-xs text-white/40'>
                {offline
                    ? 'Offline mode is meant for local development.'
                    : 'Your session is stored in a secure cookie.'}
            </p>

            <Link
                href='/'
                className='mt-6 inline-block text-xs text-white/50 underline underline-offset-4 transition-colors hover:text-white'
            >
                Back to home
            </Link>
        </div>
    </div>
  );
}

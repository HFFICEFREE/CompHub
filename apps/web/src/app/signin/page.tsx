'use client'
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
    <div className='flex flex-col items-center w-full pt-56'>
        {offline ? (
            <button
                className='h-16 w-64 bg-white hover:opacity-70 transition-opacity duration-300 ease-in-out rounded-md flex items-center justify-center p-2 text-black text-lg'
                onClick={signIn}
            >
                Enter offline workspace
            </button>
        ) : (
            <GoogleSignInButton onClick={signIn}/>
        )}
        {offline && (
            <p className='mt-6 max-w-sm text-center text-sm text-white/80'>
                Offline mode: no Supabase or Google login. Your spaces are stored in
                <span className='font-mono'> .offline/data.json</span>.
            </p>
        )}
    </div>
  );
}

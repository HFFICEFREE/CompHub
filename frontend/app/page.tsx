'use client'
import AnimatedCharacter from './play/SkinMenu/AnimatedCharacter'
import Link from 'next/link'
import BasicButton from '@/components/BasicButton'
import { Code } from '@phosphor-icons/react'

export default function Index() {
  return (
    <div className='w-full grid place-items-center h-screen gradient p-4 relative'>
      <div className='max-w-[600px] flex flex-col items-center'>
        <div>
          <h1 className='font-semibold text-3xl'>Welcome to My Gather Clone!</h1>   
          <p className='w-full text-xl my-6'>
            This project is a functional recreation of the core features of Gather, 
            built as a portfolio piece to demonstrate my technical skills and passion for virtual spaces.
          </p>
        </div>
        <div className='flex flex-col items-center justify-center'>
          <Link href='/app' >
            <BasicButton>
              Get Started
            </BasicButton>
          </Link>
          <span className='mt-4 text-sm'>or watch a demo <a href="https://www.youtube.com/watch?v=AnhsC7Fmt20" target="_blank" rel="noopener noreferrer" className='underline'>here</a></span>
        </div>
        <div className='flex flex-row items-center justify-center mt-6 gap-8'>
          <p className='text-sm'>created by <a href="https://www.trevdev.me/" target="_blank" rel="noopener noreferrer" className='font-bold underline'>trevdev</a></p>
          <div className='inline-flex flex-row items-center justify-center gap-2'>
            <a href='https://github.com/trevorwrightdev/gather-clone' target="_blank" rel="noopener noreferrer" className='text-sm underline font-bold'>see the code</a>
            <Code className='w-4 h-4'/>
          </div>
        </div>
        <AnimatedCharacter src='/sprites/characters/Character_009.png'/>
      </div>
    </div>
  )
}

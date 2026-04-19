import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { UIHelpers } from '@/helpers/uiHelpers'

type DropdownOption = {
  value: string
  label: string
}

type DropdownProps = {
  options: DropdownOption[]
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  onChange,
  placeholder = 'Select an option',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedOption, setSelectedOption] = useState<DropdownOption | null>(
    null
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleSelect = (option: DropdownOption) => {
    setSelectedOption(option)
    onChange(option.value)
    setIsOpen(false)
  }

  return (
    <div ref={dropdownRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        className={`${UIHelpers.getButtonClasses()} w-full flex justify-between`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Image
          src="/icons/down.svg"
          alt="Dropdown"
          width={16}
          height={16}
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''
            }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border-tertiary bg-background-primary shadow-xl">
          {options.map((option) => (
            <div
              key={option.value}
              className="mx-2 my-1 cursor-pointer rounded px-2 py-2 text-text-primary hover:bg-background-secondary"
              onClick={() => handleSelect(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Dropdown

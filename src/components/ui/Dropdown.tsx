import React, { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

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
        className="w-full flex items-center justify-between px-4 py-2 bg-light-gray text-lightest-gray rounded-md hvr-shadow"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <Image
          src="/icons/arrow_down.svg"
          alt="Dropdown"
          width={16}
          height={16}
          className={`transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-lightest-gray rounded-md shadow-xl max-h-60 overflow-auto">
          {options.map((option) => (
            <div
              key={option.value}
              className="mx-4 px-2 my-2 py-2 cursor-pointer hvr-shadow text-lightest-gray"
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

import { useEffect, useRef, useState } from "react"

export type ContextMenuItem = {
  label: string
  icon?: string
  onClick: () => void
  disabled?: boolean
  divider?: boolean
}

type ContextMenuProps = {
  x: number
  y: number
  onClose: () => void
  items: ContextMenuItem[]
}

export function ContextMenu({ x, y, onClose, items }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current
      const rect = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let adjustedX = x
      let adjustedY = y

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10
      }

      menu.style.left = `${Math.max(10, adjustedX)}px`
      menu.style.top = `${Math.max(10, adjustedY)}px`
    }
  }, [x, y])

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-48 rounded-md border bg-white py-1 shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.divider && (
            <div className="my-1 h-px bg-gray-200" />
          )}
          <button
            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 ${
              item.disabled ? 'cursor-not-allowed opacity-50' : ''
            }`}
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
          >
            {item.icon && <span>{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        </div>
      ))}
    </div>
  )
}

export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    items: ContextMenuItem[]
  } | null>(null)

  const showContextMenu = (event: React.MouseEvent, items: ContextMenuItem[]) => {
    event.preventDefault()
    event.stopPropagation()
    
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items
    })
  }

  const hideContextMenu = () => {
    setContextMenu(null)
  }

  const ContextMenuComponent = contextMenu ? (
    <ContextMenu
      x={contextMenu.x}
      y={contextMenu.y}
      items={contextMenu.items}
      onClose={hideContextMenu}
    />
  ) : null

  return {
    showContextMenu,
    hideContextMenu,
    ContextMenuComponent
  }
}
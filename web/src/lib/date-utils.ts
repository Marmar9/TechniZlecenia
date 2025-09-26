export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) {
      return 'Teraz'
    }
    
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `${minutes} minut${minutes === 1 ? 'a' : 'y'} temu`
    }
    
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `${hours} godzin${hours === 1 ? 'a' : 'y'} temu`
    }
    
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `${days} ${days === 1 ? 'dzień' : 'dni'} temu`
    }
    
    if (diffInSeconds < 2592000) {
      const weeks = Math.floor(diffInSeconds / 604800)
      return `${weeks} ${weeks === 1 ? 'tydzień' : 'tygodni'} ago`
    }
    
    if (diffInSeconds < 31536000) {
      const months = Math.floor(diffInSeconds / 2592000)
      return `${months} ${months === 1 ? 'miesiąc' : 'miesiące'} ago`
    }
    
    const years = Math.floor(diffInSeconds / 31536000)
    return `${years} ${years === 1 ? 'rok' : 'lata'} ago`
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Recently'
  }
}

export function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Unknown date'
  }
}

export function formatDateTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error) {
    console.error('Error formatting date:', error)
    return 'Unknown date'
  }
}

export function formatDeadline(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffInDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    if (diffInDays < 0) {
      return 'Po terminie'
    } else if (diffInDays === 0) {
      return 'Termin dzisiaj'
    } else if (diffInDays === 1) {
      return 'Termin jutro'
    } else if (diffInDays <= 7) {
      return `Termin za ${diffInDays} dni`
    } else {
      return `Termin ${formatDate(dateString)}`
    }
  } catch (error) {
    console.error('Error formatting deadline:', error)
    return 'Termin nieznany'
  }
}





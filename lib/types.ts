export type Instrument =
  | 'Guitarra Acustica' | 'Guitarra Electrica' | 'Keys' | 'Piano'
  | 'MD (Direccion Musical en vivo)' | 'Bajo' | 'Bateria'
  | 'Voz' | 'Sonido' | 'Perc menores'

export interface Member {
  id: string
  nombre: string
  apellido: string
  email: string
  telefono?: string
  instrumentos: Instrument[]
  created_at: string
}

export interface Song {
  id: string
  nombre: string
  artista: string
  tono_original?: string
  bpm?: number
  compas?: string
  link_spotify?: string
  link_letras?: string
  link_recursos?: string
  tags?: string[]
  notas?: string
  duracion_min?: number
  created_at: string
}

export interface Service {
  id: string
  fecha: string
  titulo: string
  created_at: string
}

export interface SetlistItem {
  id: string
  service_id: string
  orden: number
  song_id?: string
  song?: Song
  tono?: string
  lead_id?: string
  lead?: Member
  link?: string
}

export interface BandaAssignment {
  id: string
  service_id: string
  posicion: 'AG1'|'AG2'|'EG'|'KEYS'|'BASS'|'DRUMS'|'MD'|'SONIDO'|'VX1'|'VX2'|'VX3'|'VX4'
  member_id?: string
  member?: Member
}

export interface Invitation {
  id: string
  service_id: string
  member_id: string
  member?: Member
  service?: Service
  token: string
  status: 'pendiente'|'confirmado'|'declinado'
  comentario?: string
  sent_at?: string
  responded_at?: string
}

export interface ServiceBlock {
  id: string
  service_id: string
  orden: number
  tipo: 'cancion' | 'bloque'
  titulo?: string
  duracion_min?: number
  notas?: string
  song_id?: string
  song?: Song
  tono?: string
  lead_id?: string
  lead?: Member
}

// Updated Song with float bpm and duracion_min
// (already in Song interface above — just update bpm type mentally to number/float)

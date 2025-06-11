export interface Coords {
    x: number
    y: number
}
export function toKey(coords: Coords): string {
    return `${coords.x}, ${coords.y}`
}
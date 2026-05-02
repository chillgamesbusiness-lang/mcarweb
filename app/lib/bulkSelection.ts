export interface BulkSelectionState {
  selectedIds: string[]
  selectedVisibleIds: string[]
  allVisibleSelected: boolean
  someVisibleSelected: boolean
}

function unique(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))]
}

export function createBulkSelectionState(
  visibleIds: string[],
  selectedIds: string[]
): BulkSelectionState {
  const visible = unique(visibleIds)
  const selected = new Set(unique(selectedIds))
  const selectedVisibleIds = visible.filter((id) => selected.has(id))

  return {
    selectedIds: [...selected],
    selectedVisibleIds,
    allVisibleSelected: visible.length > 0 && selectedVisibleIds.length === visible.length,
    someVisibleSelected: selectedVisibleIds.length > 0 && selectedVisibleIds.length < visible.length,
  }
}

export function toggleVisibleSelection(
  visibleIds: string[],
  selectedIds: string[],
  checked: boolean
): string[] {
  const visible = unique(visibleIds)
  if (checked) return visible

  const visibleSet = new Set(visible)
  return unique(selectedIds).filter((id) => !visibleSet.has(id))
}

export function keepOnlyVisibleSelection(visibleIds: string[], selectedIds: string[]): string[] {
  const visibleSet = new Set(unique(visibleIds))
  return unique(selectedIds).filter((id) => visibleSet.has(id))
}
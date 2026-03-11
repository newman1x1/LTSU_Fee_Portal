import { supabase } from '../lib/supabase'

export const logAction = async ({
  actionType,
  performedByRole,
  performedByName,
  performedById = null,
  targetName = null,
  targetRoll = null,
  details = null,
  sectionName = null,
  branchName = null,
}) => {
  try {
    const { error } = await supabase.from('activity_logs').insert({
      action_type: actionType,
      performed_by_role: performedByRole,
      performed_by_name: performedByName,
      performed_by_id: performedById,
      target_name: targetName,
      target_roll: targetRoll,
      details: details,
      section_name: sectionName,
      branch_name: branchName,
    })
    if (error) console.error('Failed to log action:', error)
  } catch (err) {
    console.error('Failed to log action:', err)
  }
}

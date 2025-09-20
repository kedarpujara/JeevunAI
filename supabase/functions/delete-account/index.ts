// supabase/functions/delete-account/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization')!
    
    // Create a client for the user (to verify auth)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    // Get the user from the JWT
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { userId } = await req.json()

    // Verify the user is trying to delete their own account
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - can only delete your own account' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log(`Starting account deletion for user: ${userId}`)

    // Track what gets deleted for logging
    const deletionSummary = {
      journalEntries: 0,
      profileDeleted: false,
      filesDeleted: 0,
      bucketsProcessed: [],
      authUserDeleted: false
    }

    // Delete user data in the correct order (foreign key constraints)
    
    // 1. Delete journal entries (if you have this table)
    const { data: entriesData, error: journalError } = await supabaseAdmin
      .from('entries')
      .delete()
      .eq('user_id', userId)
      .select('id')
    
    if (journalError) {
      console.error('Error deleting journal entries:', journalError)
      // Continue with deletion even if this fails
    } else {
      deletionSummary.journalEntries = entriesData?.length || 0
      console.log(`Deleted ${deletionSummary.journalEntries} journal entries`)
    }

    // 2. Delete user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .delete()
      .eq('id', userId)
    
    if (profileError) {
      console.error('Error deleting user profile:', profileError)
      // Continue with deletion even if this fails
    } else {
      deletionSummary.profileDeleted = true
      console.log('User profile deleted successfully')
    }

    // 3. Delete files from storage buckets
    const bucketsToClean = ['avatars', 'attachments', 'audio', 'photos', 'journal-photos']
    
    for (const bucket of bucketsToClean) {
      try {
        // First, try to list files in the user's folder
        const { data: files, error: listError } = await supabaseAdmin
          .storage
          .from(bucket)
          .list(userId)

        if (listError) {
          console.error(`Error listing files in ${bucket}/${userId}:`, listError)
          // Try listing files at root level with user ID prefix
          const { data: rootFiles, error: rootListError } = await supabaseAdmin
            .storage
            .from(bucket)
            .list('', {
              search: userId
            })
          
          if (rootListError) {
            console.error(`Error listing root files in ${bucket}:`, rootListError)
            continue
          }
          
          if (rootFiles && rootFiles.length > 0) {
            const rootFilePaths = rootFiles
              .filter(file => file.name.includes(userId))
              .map(file => file.name)
            
            if (rootFilePaths.length > 0) {
              const { error: storageError } = await supabaseAdmin
                .storage
                .from(bucket)
                .remove(rootFilePaths)
              
              if (storageError) {
                console.error(`Error deleting root files from ${bucket}:`, storageError)
              } else {
                deletionSummary.filesDeleted += rootFilePaths.length
                deletionSummary.bucketsProcessed.push(bucket)
                console.log(`Successfully deleted ${rootFilePaths.length} root files from ${bucket}`)
              }
            }
          }
        } else if (files && files.length > 0) {
          // Files found in user folder
          const filePaths = files.map(file => `${userId}/${file.name}`)
          const { error: storageError } = await supabaseAdmin
            .storage
            .from(bucket)
            .remove(filePaths)
          
          if (storageError) {
            console.error(`Error deleting files from ${bucket}:`, storageError)
          } else {
            deletionSummary.filesDeleted += files.length
            deletionSummary.bucketsProcessed.push(bucket)
            console.log(`Successfully deleted ${files.length} files from ${bucket}`)
          }
        } else {
          console.log(`No files found in ${bucket} for user ${userId}`)
        }
      } catch (error) {
        console.error(`Unexpected error processing bucket ${bucket}:`, error)
      }
    }

    // 4. Finally, delete the auth user (this must be last)
    const { error: deleteUserError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    
    if (deleteUserError) {
      console.error('Error deleting auth user:', deleteUserError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to delete user account', 
          details: deleteUserError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    deletionSummary.authUserDeleted = true
    console.log(`Successfully deleted account for user: ${userId}`)
    console.log('Deletion Summary:', deletionSummary)

    return new Response(
      JSON.stringify({ 
        message: 'Account successfully deleted',
        summary: deletionSummary
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
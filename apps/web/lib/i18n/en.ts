// ── Translations interface — all string values ──────────────────────────
// Both en.ts and ar.ts must satisfy this shape.
export interface Translations {
  nav: {
    home: string; analytics: string; resumes: string; reminders: string;
    templates: string; vault: string; settings: string; campaigns: string;
    newCampaign: string; noCampaigns: string; signOut: string;
  };
  common: {
    save: string; cancel: string; delete: string; edit: string; add: string;
    close: string; confirm: string; loading: string; saving: string;
    deleting: string; creating: string; search: string; filter: string;
    export: string; download: string; upload: string; view: string;
    back: string; next: string; submit: string; retry: string; yes: string;
    no: string; or: string; and: string; of: string; all: string; none: string;
    optional: string; required: string; new: string; archive: string;
    unarchive: string; archived: string; active: string;
  };
  auth: {
    signIn: string; signUp: string; signOut: string; email: string;
    password: string; name: string; forgotPassword: string;
    resetPassword: string; verifyEmail: string; continueWithGoogle: string;
    continueWithGitHub: string; continueWithEmail: string;
    alreadyHaveAccount: string; noAccount: string;
  };
  dashboard: {
    title: string; welcome: string; totalApplications: string;
    activeApplications: string; interviews: string; offers: string;
    quickActions: string; recentActivity: string; noActivity: string;
    upcomingReminders: string; noReminders: string; viewAll: string;
  };
  board: {
    addApplication: string; noApplications: string; dragToMove: string;
    wipLimit: string; column: string; addColumn: string; editColumn: string;
    deleteColumn: string;
  };
  application: {
    company: string; role: string; location: string; source: string;
    status: string; priority: string; salary: string; salaryMin: string;
    salaryMax: string; currency: string; workType: string; jobUrl: string;
    jobDescription: string; coverLetter: string; interviewDate: string;
    offerDeadline: string; appliedDate: string; notes: string;
    contacts: string; attachments: string; resume: string; tags: string;
    remote: string; hybrid: string; onsite: string;
    high: string; medium: string; low: string;
    archiveApp: string; unarchiveApp: string;
  };
  settings: {
    title: string; subtitle: string; profile: string; displayName: string;
    email: string; saveChanges: string; saved: string; changesSaved: string;
    preferences: string; timezone: string; dailyDigest: string;
    dailyDigestDesc: string; language: string; theme: string; darkMode: string;
    lightMode: string; browserExtension: string; extensionDesc: string;
    connected: string; notConnected: string; connectExtension: string;
    disconnectExtension: string; connecting: string; dangerZone: string;
    dangerZoneDesc: string; signOut: string; deleteAccount: string;
    deleteAccountWarning: string; typeDeleteConfirm: string; deleting: string;
  };
  vault: {
    title: string; subtitle: string; search: string; noResults: string;
    addFirst: string; reanalyze: string; exportPdf: string; skills: string;
    experience: string; education: string; archivedApps: string;
  };
  reminders: {
    title: string; subtitle: string; newReminder: string; noReminders: string;
    createFirst: string; type: string; message: string; remindAt: string;
    linkedApp: string; dismiss: string; dismissed: string; upcoming: string;
    overdue: string;
  };
  analytics: {
    title: string; subtitle: string; conversionFunnel: string;
    weeklyActivity: string; sourcePerformance: string; resumePerformance: string;
    momentumScore: string; timeInStage: string; salaryDistribution: string;
    noData: string; days: string; applications: string;
  };
  templates: {
    title: string; subtitle: string; newTemplate: string; noTemplates: string;
    copy: string; copied: string; subject: string; body: string;
    category: string; preview: string;
  };
  resumes: {
    title: string; subtitle: string; upload: string; noResumes: string;
    uploadFirst: string; label: string; fileName: string; fileSize: string;
    uploadedAt: string; download: string; deleteResume: string;
  };
  campaign: {
    create: string; edit: string; delete: string; name: string; goal: string;
    targetRole: string; salary: string; currency: string; targetEndDate: string;
    weeklyGoal: string; status: string; active: string; paused: string;
    completed: string; deleteWarning: (name: string) => string;
  };
}

// ── English ────────────────────────────────────────────────────────────────
export const en: Translations = {
  nav: {
    home: 'Home', analytics: 'Analytics', resumes: 'Resumes',
    reminders: 'Reminders', templates: 'Templates', vault: 'Vault',
    settings: 'Settings', campaigns: 'Campaigns', newCampaign: 'New Campaign',
    noCampaigns: 'No campaigns yet', signOut: 'Sign Out',
  },
  common: {
    save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add',
    close: 'Close', confirm: 'Confirm', loading: 'Loading...', saving: 'Saving...',
    deleting: 'Deleting...', creating: 'Creating...', search: 'Search',
    filter: 'Filter', export: 'Export', download: 'Download', upload: 'Upload',
    view: 'View', back: 'Back', next: 'Next', submit: 'Submit', retry: 'Retry',
    yes: 'Yes', no: 'No', or: 'or', and: 'and', of: 'of', all: 'All',
    none: 'None', optional: 'Optional', required: 'Required', new: 'New',
    archive: 'Archive', unarchive: 'Unarchive', archived: 'Archived', active: 'Active',
  },
  auth: {
    signIn: 'Sign In', signUp: 'Sign Up', signOut: 'Sign Out', email: 'Email',
    password: 'Password', name: 'Name', forgotPassword: 'Forgot Password?',
    resetPassword: 'Reset Password', verifyEmail: 'Verify Email',
    continueWithGoogle: 'Continue with Google', continueWithGitHub: 'Continue with GitHub',
    continueWithEmail: 'Continue with Email', alreadyHaveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
  },
  dashboard: {
    title: 'Dashboard', welcome: 'Welcome back', totalApplications: 'Total Applications',
    activeApplications: 'Active Applications', interviews: 'Interviews', offers: 'Offers',
    quickActions: 'Quick Actions', recentActivity: 'Recent Activity',
    noActivity: 'No recent activity', upcomingReminders: 'Upcoming Reminders',
    noReminders: 'No upcoming reminders', viewAll: 'View All',
  },
  board: {
    addApplication: 'Add Application', noApplications: 'No applications yet',
    dragToMove: 'Drag cards to move between columns', wipLimit: 'WIP Limit',
    column: 'Column', addColumn: 'Add Column', editColumn: 'Edit Column',
    deleteColumn: 'Delete Column',
  },
  application: {
    company: 'Company', role: 'Role', location: 'Location', source: 'Source',
    status: 'Status', priority: 'Priority', salary: 'Salary', salaryMin: 'Salary Min',
    salaryMax: 'Salary Max', currency: 'Currency', workType: 'Work Type',
    jobUrl: 'Job URL', jobDescription: 'Job Description', coverLetter: 'Cover Letter',
    interviewDate: 'Interview Date', offerDeadline: 'Offer Deadline',
    appliedDate: 'Applied Date', notes: 'Notes', contacts: 'Contacts',
    attachments: 'Attachments', resume: 'Resume', tags: 'Tags',
    remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
    high: 'High', medium: 'Medium', low: 'Low',
    archiveApp: 'Archive Application', unarchiveApp: 'Unarchive Application',
  },
  settings: {
    title: 'Settings', subtitle: 'Manage your account and preferences.',
    profile: 'Profile', displayName: 'Display Name', email: 'Email',
    saveChanges: 'Save Changes', saved: '✅ Saved!', changesSaved: 'Changes saved successfully',
    preferences: 'Preferences', timezone: 'Timezone', dailyDigest: 'Daily Digest Email',
    dailyDigestDesc: 'Receive a summary of reminders and activity',
    language: 'Language', theme: 'Theme', darkMode: 'Dark Mode', lightMode: 'Light Mode',
    browserExtension: 'Browser Extension',
    extensionDesc: 'Save jobs from LinkedIn and YemenHR to your board with one click.',
    connected: 'Connected', notConnected: 'Not connected',
    connectExtension: '🔌 Connect Extension', disconnectExtension: 'Disconnect Extension',
    connecting: '⏳ Connecting…', dangerZone: 'Danger Zone',
    dangerZoneDesc: 'These actions are permanent and cannot be undone.',
    signOut: 'Sign Out', deleteAccount: 'Delete Account',
    deleteAccountWarning: '⚠️ This will permanently delete your account and all data (campaigns, applications, resumes, etc).',
    typeDeleteConfirm: 'Type DELETE to confirm', deleting: 'Deleting...',
  },
  vault: {
    title: 'Job Description Vault', subtitle: 'All captured job descriptions',
    search: 'Search by company, role, or skills...', noResults: 'No job descriptions found.',
    addFirst: 'Add your first job application to start building your vault.',
    reanalyze: 'Re-analyze with AI', exportPdf: 'Export PDF', skills: 'Skills',
    experience: 'Experience', education: 'Education', archivedApps: 'Archived Applications',
  },
  reminders: {
    title: 'Reminders', subtitle: 'Stay on top of your job search',
    newReminder: 'New Reminder', noReminders: 'No reminders yet.',
    createFirst: 'Create your first reminder to stay organized.',
    type: 'Type', message: 'Message', remindAt: 'Remind At',
    linkedApp: 'Linked Application', dismiss: 'Dismiss', dismissed: 'Dismissed',
    upcoming: 'Upcoming', overdue: 'Overdue',
  },
  analytics: {
    title: 'Analytics', subtitle: 'Insights into your job search',
    conversionFunnel: 'Conversion Funnel', weeklyActivity: 'Weekly Activity',
    sourcePerformance: 'Source Performance', resumePerformance: 'Resume Performance',
    momentumScore: 'Momentum Score', timeInStage: 'Average Time in Stage',
    salaryDistribution: 'Salary Distribution', noData: 'Not enough data yet.',
    days: 'days', applications: 'Applications',
  },
  templates: {
    title: 'Email Templates', subtitle: 'Pre-written templates for your job search emails',
    newTemplate: 'New Template', noTemplates: 'No templates yet.',
    copy: 'Copy', copied: 'Copied!', subject: 'Subject', body: 'Body',
    category: 'Category', preview: 'Preview',
  },
  resumes: {
    title: 'Resume Manager', subtitle: 'Manage and track your resume versions',
    upload: 'Upload Resume', noResumes: 'No resumes yet.',
    uploadFirst: 'Upload your first resume to get started.',
    label: 'Label', fileName: 'File Name', fileSize: 'File Size',
    uploadedAt: 'Uploaded', download: 'Download', deleteResume: 'Delete Resume',
  },
  campaign: {
    create: 'Create Campaign', edit: 'Edit Campaign', delete: 'Delete Campaign',
    name: 'Campaign Name', goal: 'Goal', targetRole: 'Target Role', salary: 'Salary',
    currency: 'Currency', targetEndDate: 'Target End Date', weeklyGoal: 'Weekly Goal',
    status: 'Status', active: 'Active', paused: 'Paused', completed: 'Completed',
    deleteWarning: (name: string) => `Delete "${name}"? All applications in this campaign will be permanently deleted.`,
  },
};

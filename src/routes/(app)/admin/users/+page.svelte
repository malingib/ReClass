<script lang="ts">
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  import DataTable from '$lib/components/DataTable.svelte';

  let { data } = $props();
  let users = $derived(data.users);
</script>

<DashboardContent title="Users" subtitle="System users and roles">
  <DataTable
    data={users}
    columns={[
      { key: 'user_id', label: 'User ID' },
      { key: 'role', label: 'Role', sortable: true },
      { key: 'profiles', label: 'Name', render: (u: any) => u.profiles?.[0]?.full_name ?? '—' },
    ]}
    emptyMessage="No users found"
  />
</DashboardContent>

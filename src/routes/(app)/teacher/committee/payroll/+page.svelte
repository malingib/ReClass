<script lang="ts">
  import PayrollComponentsPanel from '$lib/components/payroll/PayrollComponentsPanel.svelte';
  import DashboardContent from '$lib/components/DashboardContent.svelte';
  const { data } = $props();
</script>
<DashboardContent title="Payroll components" subtitle="Treasurer workspace · transparent compensation breakdown">
  <PayrollComponentsPanel runs={data.runs} components={data.components} />
</DashboardContent>
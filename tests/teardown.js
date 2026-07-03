export default function () {
  console.log('Global Teardown: Forcing exit to prevent CI hang...');
  setTimeout(() => process.exit(0), 500).unref();
}

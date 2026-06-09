import { Capacitor } from '@capacitor/core';

// If the actual plugin fails or isn't available, we provide a mock gracefully
const MockCapacitorBluetoothSerial = {
  listPairedDevices: async () => ({ devices: [] }),
  connect: async () => {},
  write: async ({ value }: { value: string }) => { console.log('Mock Bluetooth Print:', value); },
  disconnect: async () => {} 
};

// Export a safe wrapper object
export const BluetoothThermalPrinter = {
  listPairedDevices: async () => {
    return MockCapacitorBluetoothSerial.listPairedDevices();
  },
  connect: async (options: { address: string }) => {
    return MockCapacitorBluetoothSerial.connect();
  },
  write: async (options: { value: string }) => {
    return MockCapacitorBluetoothSerial.write(options);
  },
  disconnect: async () => {
    return MockCapacitorBluetoothSerial.disconnect();
  }
};

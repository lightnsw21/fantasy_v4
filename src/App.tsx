import { MantineProvider } from '@mantine/core';
import { FantasyTable } from './components/FantasyTable';

function App() {
    return (
        <MantineProvider>
            <div style={{ padding: '2rem' }}>
                <h1>Fantasy Sheets</h1>
                <FantasyTable />
            </div>
        </MantineProvider>
    );
}

export default App; 
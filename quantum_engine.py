import sys
import json
import random
import qiskit
from qiskit_aer import AerSimulator
from qiskit import QuantumCircuit, transpile
import pandas as pd
import networkx as nx
import matplotlib
matplotlib.use('Agg') # Para generar imágenes sin interfaz gráfica
import matplotlib.pyplot as plt

def main():
    try:
        # 1. QISKIT NATIVO: Optimización Cuántica (QAOA simplificado)
        # Creamos un circuito que represente una superposición de rutas
        qc = QuantumCircuit(3, 3)
        qc.h(range(3)) # Superposición de todas las rutas posibles
        qc.cx(0, 1)
        qc.cx(1, 2)
        qc.measure(range(3), range(3))
        
        simulator = AerSimulator()
        compiled_circuit = transpile(qc, simulator)
        job = simulator.run(compiled_circuit, shots=1024)
        result = job.result()
        counts = result.get_counts()
        
        # 2. PANDAS & NETWORKX: Análisis de Datos y Grafos Criminales
        # Simulamos una base de datos de delitos
        data = {
            'Zona': ['Norte', 'Sur', 'Centro', 'Oriente', 'Poniente'],
            'Incidentes': [45, 12, 78, 34, 21],
            'Riesgo': ['Alto', 'Bajo', 'Crítico', 'Medio', 'Bajo']
        }
        df = pd.DataFrame(data)
        
        # Creamos un grafo de vínculos criminales
        G = nx.Graph()
        G.add_edges_from([('Cartel A', 'Zona Norte'), ('Cartel A', 'Policía Corrupta'), ('Cartel B', 'Zona Centro')])
        
        # 3. MATPLOTLIB: Mapa de Calor Táctico
        plt.figure(figsize=(6, 4))
        plt.bar(df['Zona'], df['Incidentes'], color=['#ff1744' if r == 'Crítico' else '#ffb300' if r == 'Alto' else '#00e676' for r in df['Riesgo']])
        plt.title('Mapa de Calor delictivo (Generado por Python)')
        plt.ylabel('Número de Incidentes')
        plt.savefig('heatmap_tactico.png')
        plt.close()

        # Empaquetar resultados para Node.js
        output = {
            "success": True,
            "quantum_result": counts,
            "pandas_analysis": df.to_dict(orient='records'),
            "network_edges": list(G.edges()),
            "heatmap_generated": "heatmap_tactico.png"
        }
        
        # Imprimir en formato JSON para que Node.js lo lea
        print(json.dumps(output))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))

if __name__ == "__main__":
    main()

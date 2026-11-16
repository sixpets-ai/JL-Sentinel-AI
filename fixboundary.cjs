const fs = require('fs');
const p = 'C:/Users/Wyse/Desktop/J-L-Sentinel-AI/05_Respaldo_Codigo/Intelligent-Patrols/App.tsx';
let c = fs.readFileSync(p, 'utf8');
const boundary = '\nclass Map3DErrorBoundary extends React.Component {\n  constructor(p){super(p);this.state={crashed:false};}\n  static getDerivedStateFromError(){return {crashed:true};}\n  componentDidCatch(){setTimeout(()=>this.setState({crashed:false}),100);}\n  render(){if(this.state.crashed)return null;return this.props.children;}\n}\n';
c = c.replace('function App()', boundary + 'function App()');
c = c.replace('{!isAuth && <div key="map3d-container"', '{!isAuth && <Map3DErrorBoundary><div key="map3d-container"');
c = c.replace('><TacticalMap3D /></div>}', '><TacticalMap3D /></div></Map3DErrorBoundary>}');
fs.writeFileSync(p, c, 'utf8');
console.log('MAP3D BOUNDARY OK');

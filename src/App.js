import React, { Component } from 'react';
import Map from './Map';
import cities from './static-data/cities';


const selectStyle = {
  position:'absolute',
  with:'300px',
  margin:15,
  boxShadow:'1px 2px 4px rgba(0,0,0,0.3)',
  outline:'none'
}

class App extends Component {
  constructor(){
    super();
    this.state = {
      selectedCity:cities[0]
    }
  }

  onCityChanged = (ev) => {
    const value = parseInt(ev.target.value);
    this.setState({selectedCity:cities.filter(city => city.id === value)[0]});
  }

  render() {
    return (
      <div className="App">
        <select style={selectStyle} onChange={this.onCityChanged} defaultValue={this.state.selectedCity.id}>
          {
            cities.map((city)=>{
              return <option key={city.id} value={city.id}>{city.name}</option>
            })
          }
        </select>
        <Map bbox={this.state.selectedCity.bbox}/>
      </div>
    );
  }
}

export default App;

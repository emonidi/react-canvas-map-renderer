import React, { Component } from 'react';
import * as osmtojson from 'osmtogeojson';
import * as topojson from 'topojson';
import { geoPath, select, geoMercator, geoCentroid, zoom, event } from 'd3';
export default class Map extends Component {

    constructor(props) {
        super(props);
        this.state = {
            width: window.innerWidth,
            height: window.innerHeight
        }
    }

    componentDidMount() {
        this.initializeMap();
    }

    componentWillReceiveProps(props) {
        this.props = props;
        this.initializeMap();
    }

    initializeMap = () => {
        let ctx = this.canvas.getContext('2d');
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        
        let z = select(this.canvas).call(zoom()
            .scaleExtent([0.1, 3])
            .on("zoom", this.zoomed));

        this.getMapData(this.props.bbox).then((geojson) => {
            let center = geoCentroid(geojson);
            let { scale, translate } = this.getScaleAndTranslate(this.props.bbox, this.state.width, this.state.height);
            let projection = geoMercator().translate(translate).scale(scale);
            let path = geoPath().projection(projection).context(ctx);
            //let topo = topojson.topology({t:geojson});
            this.setState({ path, projection, ctx, geojson, scale, translate });
            // this.draw(geojson.features,ctx,path);
            this.zoomed();
            
        })
    }

    getScaleAndTranslate = (boundBox, width, height) => {
        let projection = geoMercator().scale(1).translate([0, 0]);
        let path = geoPath().projection(projection);
        let N = boundBox.top,
            E = boundBox.left,
            W = boundBox.right,
            S = boundBox.bottom,
            bbox = {
                "type": "Polygon",
                "coordinates": [
                    [
                        [E, N],
                        [W, N],
                        [W, S],
                        [E, S]
                    ]]
            };

        let b = path.bounds(bbox),
            s = .95 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
            t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

        return { scale: s, translate: t }
    }

    getMapData = (bbox) => {
        
        return new Promise((resolve, reject) => {
            fetch(`https://www.openstreetmap.org/api/0.6/map?bbox=${bbox.left},${bbox.bottom},${bbox.right},${bbox.top}`)
                .then(res => res.text())
                .then((xml) => {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(xml, 'text/xml')
                    var geojson = osmtojson(xmlDoc);
                    resolve(geojson);
                })
        })
    }

    draw(features, ctx, path) {
        features.forEach((feature) => {
            const properties =  feature.properties;
            if (properties.highway) {
                ctx.beginPath();
                path(feature);
                if (this.propertyIs(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service', 'track'], properties.highway)) {
                    ctx.strokeStyle = 'brown';
                    ctx.lineWidth = properties.highway === 'primary' ? 7 : 4;
                    ctx.stroke();
                    switch(properties.highway){
                        case 'motorway':
                        ctx.strokeStyle = 'rgb(230,147,163)'
                        ctx.lineWidth = 9;
                        break;
                        case 'primary':
                        ctx.strokeStyle = 'orange'
                        ctx.lineWidth = 6;
                        break;
                        case 'secondary':
                        case 'tertiary':
                        case 'unclassified':
                        case 'service':
                        case 'trunk':
                        default:
                        ctx.strokeStyle = 'white'
                        ctx.lineWidth = 3;
                        break;
                    }
                    ctx.stroke();
                }else if(this.propertyIs(['pedestrian'],properties.highway)){
                    ctx.fillStyle = '#ccc';
                    ctx.strokeStyle = '#ccc';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fill();
                }
                ctx.closePath();
            }

            if(properties.leisure && this.propertyIs(['park'],properties.leisure) ){
                ctx.strokeStyle = '#6D8700';
                ctx.fillStyle = '#6D8700';
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }

            if (properties.building) {
                ctx.beginPath();
                ctx.strokeStyle = 'rgb(181,167,157)';
                ctx.fillStyle = 'rgb(217,208,201)'
                ctx.strokeWidth = 1;
                path(feature);
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }
            if (properties.natural && feature.geometry.type === 'Polygon') {
                ctx.beginPath();
                path(feature);
                switch (feature.properties.natural) {
                    case 'water':
                        ctx.strokeStyle = '#4192D9';
                        ctx.fillStyle = '#4192D9';
                        break;
                    case "wood":
                        ctx.strokeStyle = 'dark-green';
                        ctx.fillStyle = 'dark-green'
                        break;
                    case "grassland":
                        ctx.strokeStyle = '#6D8700';
                        ctx.fillStyle = '#6D8700'
                        break;
                    case "sand":
                    case "beach":
                        ctx.strokeStyle = '#e7c496';
                        ctx.fillStyle = '#e7c496'
                        break;
                    case "scrub":
                        ctx.strokeStyle = '#565900';
                        ctx.fillStyle = '#565900'
                        break;

                }
                ctx.stroke();
                ctx.fill();
                ctx.closePath();
            }

        })
    }

    propertyIs(types, type) {
        let result = false;
        types.forEach((t) => {
            if (t === type) {
                result = true;
            }
        })

        return result;
    }

    zoomed = () => {
        
        let ev = event || { transform: { k: 0 } }
        let ctx = this.state.ctx;
        
        const factor = (ev.transform.k / 500);
        let { scale, translate } = this.getScaleAndTranslate({
            left: this.props.bbox.left + factor,
            bottom: this.props.bbox.bottom + factor,
            right: this.props.bbox.right - factor,
            top: this.props.bbox.top - factor,
        }, this.state.width, this.state.height)
        let projection = geoMercator().translate(translate).scale(scale);
        let path = geoPath().projection(projection).context(ctx);
        this.setState({ path, projection });
        ctx.save();
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        this.draw(this.state.geojson.features, ctx, path);
        ctx.restore();
    }


    render() {
        return (<canvas style={{ background: 'rgb(242,239,233)' }} ref={el => this.canvas = el} width={this.state.width} height={this.state.height}></canvas>);
    }

}
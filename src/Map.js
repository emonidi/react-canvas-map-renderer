import React, { Component } from 'react';
import * as osmtojson from 'osmtogeojson';
import * as topojson from 'topojson';
import { geoPath, select, geoMercator, geoCentroid, zoom, event } from 'd3';
import { throttle } from 'lodash';
import { ENGINE_METHOD_DIGESTS } from 'constants';
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
        ctx.mozImageSmoothingEnabled = false;  // firefox
        ctx.imageSmoothingEnabled = false;
        let self = this;
        let offScreenCanvas =  document.createElement('canvas');
        offScreenCanvas.width = this.state.width;
        offScreenCanvas.height = this.state.height;
        let ofsCtx = offScreenCanvas.getContext('2d');

        ctx.clearRect(0, 0, this.state.width, this.state.height);

        let z = select(this.canvas).call(zoom()
            .scaleExtent([0.1, 20])
            .on("zoom",(ev,to)=>{
                return this.zoomed(true);
            }));

        this.getMapData(this.props.bbox).then((geojson) => {
            let center = geoCentroid(geojson);
            let { scale, translate } = this.getScaleAndTranslate(this.props.bbox, this.state.width, this.state.height,1);
            let projection = geoMercator().translate(translate).scale(scale);
            let path = geoPath().projection(projection).context(ofsCtx);
            this.setState({ ofsCtx, ctx, geojson,projection, path });
            this.scaleProjection(scale,translate);
        })
    }

    getScaleAndTranslate = (boundBox, width, height,zoom = 1) => {
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
            s = zoom / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
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
        ctx.save();
        features.forEach((feature) => {
            ctx.beginPath();
            const properties = feature.properties;
            if (properties.highway) {
                path(feature);
                if (this.propertyIs(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'service', 'track'], properties.highway)) {
                    ctx.strokeStyle = '#ccc';
                    switch (properties.highway) {
                        case 'motorway':
                            ctx.lineWidth = 9;
                            break;
                        case 'primary':
                            ctx.lineWidth = 7;
                            break;
                        default:
                            ctx.lineWidth = 5;
                    }
                    ctx.stroke();
                    switch (properties.highway) {
                        case 'motorway':
                            ctx.strokeStyle = 'rgb(230,147,163)'
                            ctx.lineWidth = 7;
                            break;
                        case 'primary':
                            ctx.strokeStyle = 'orange'
                            ctx.lineWidth = 5;
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
                } else if (this.propertyIs(['pedestrian'], properties.highway)) {
                    ctx.fillStyle = '#ccc';
                    ctx.strokeStyle = '#ccc';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                    ctx.fill();
                }

            }

            if (properties.leisure && this.propertyIs(['park'], properties.leisure)) {
                ctx.strokeStyle = 'rgb(201,249,205)';
                ctx.fillStyle = 'rgb(201,249,205)';
                path(feature);
                ctx.stroke();
                ctx.fill();
            }

            if (properties.building) {
                ctx.strokeStyle = 'rgb(181,167,157)';
                ctx.fillStyle = 'rgb(217,208,201)'
                ctx.strokeWidth = 1;
                path(feature);
                ctx.stroke();
                ctx.fill();

            }
            if (properties.natural && feature.geometry.type === 'Polygon') {
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

            }
            ctx.closePath();
        })
        ctx.restore();
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

    zoomed = (throttled) => {
        let self = this;

        let k = event.transform.k;
        
        const factor = (k / 500);
        const  bounds = {
            left: this.props.bbox.left + factor,
            bottom: this.props.bbox.bottom + factor,
            right: this.props.bbox.right - factor,
            top: this.props.bbox.top - factor,
        }
        let { scale, translate } = this.getScaleAndTranslate(bounds, this.state.width, this.state.height, k);
        
        self.scaleProjection(scale,translate);
    }

    scaleProjection = (scale,translate)=>{
        let ctx = this.state.ofsCtx
        let projection = this.state.projection.translate(translate).scale(scale);
        let path = this.state.path.projection(projection).context(ctx);
        
        
        let start = console.time();
        ctx.clearRect(0, 0, this.state.width, this.state.height);
        this.draw(this.state.geojson.features, ctx, path);
        console.timeEnd(start);
        
        let imageData = ctx.getImageData(0, 0, this.state.width, this.state.height);
        this.state.ctx.putImageData(imageData, 0, 0);

        this.setState({projection,path})
    }


    render() {
        return (<canvas style={{ background: 'rgb(242,239,233)' }} ref={el => this.canvas = el} width={this.state.width} height={this.state.height}></canvas>);
    }

}
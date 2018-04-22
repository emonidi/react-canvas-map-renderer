export default function (context) {
    var points = [],
        velocity2 = 5, // velocity squared
        radius = 5,
        boundaryX = 200,
        boundaryY = 200,
        numberOfPoints = 30,
        shouldAnimate = true;
        

    return {
        init:init,
        destroy:function(){
            shouldAnimate = false;
            context.clearRect(0,0,window.innerWidth, window.innerHeight);
           
            // setTimeout(()=>{
            //     context.clearRect(0, 0, window.innerWidth, window.innerHeight)
            // },100);
        }
    }

    function init() {
        // create points
        for (var i = 0; i < numberOfPoints; i++) {
            createPoint();
        }
        // create connections
        for (var i = 0, l = points.length; i < l; i++) {
            var point = points[i];
            if (i == 0) {
                points[i].buddy = points[points.length - 1];
            } else {
                points[i].buddy = points[i - 1];
            }
        }

        // animate
        animate();
    }

    function createPoint() {
        let point = {}, vx2, vy2;
        point.x = Math.random() * boundaryX;
        point.y = Math.random() * boundaryY;
        // random vx 
        point.vx = (Math.floor(Math.random()) * 2 - 1) * Math.random();
        vx2 = Math.pow(point.vx, 2);
        // vy^2 = velocity^2 - vx^2
        vy2 = velocity2 - vx2;
        point.vy = Math.sqrt(vy2) * (Math.random() * 2 - 1);
        points.push(point);
    }

    function resetVelocity(point, axis, dir) {
        let vx, vy;
        if (axis == 'x') {
            point.vx = dir * Math.random();
            let vx2 = Math.pow(point.vx, 2);
            // vy^2 = velocity^2 - vx^2
            let vy2 = velocity2 - vx2;
            point.vy = Math.sqrt(vy2) * (Math.random() * 2 - 1);
        } else {
            point.vy = dir * Math.random();
            let vy2 = Math.pow(point.vy, 2);
            // vy^2 = velocity^2 - vx^2
            let vx2 = velocity2 - vy2;
            point.vx = Math.sqrt(vx2) * (Math.random() * 2 - 1);
        }
    }

    function drawCircle(x, y) {
        context.beginPath();
        context.arc(x, y, radius, 0, 2 * Math.PI, false);
        context.fillStyle = '#97badc';
        context.fill();
    }

    function drawLine(x1, y1, x2, y2) {
        context.beginPath();
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.strokeStyle = '#8ab2d8'
        context.stroke();
    }

    function draw() {
        for (var i = 0, l = points.length; i < l; i++) {
            // circles
            var point = points[i];
            point.x += point.vx;
            point.y += point.vy;
            drawCircle(point.x, point.y);
            // lines
            drawLine(point.x, point.y, point.buddy.x, point.buddy.y);
            // check for edge
            if (point.x < 0 + radius) {
                resetVelocity(point, 'x', 1);
            } else if (point.x > boundaryX - radius) {
                resetVelocity(point, 'x', -1);
            } else if (point.y < 0 + radius) {
                resetVelocity(point, 'y', 1);
            } else if (point.y > boundaryY - radius) {
                resetVelocity(point, 'y', -1);
            }
        }
    }

    function animate() {
        context.clearRect(0, 0, 200, 200);
        if(!shouldAnimate) return;
        draw();
        requestAnimationFrame(animate);
    }
}
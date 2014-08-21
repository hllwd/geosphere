/**
 * Created by nicolasmondon on 16/08/2014.
 */
;!function(th, thx, $, Detector, toxi, d3, win){

    var container, scene, camera, renderer;
    var controls;

    var radiusSphere = 100, radiusCountries = 101;

    var shaderMaterial;

    function onSetup(raw){

        // width
        var w = win.innerWidth;
        // height
        var h = win.innerHeight;
        var viewAngle = 40;
        var aspect = w / h;
        var near = 0.1;
        var far = 20000;
        var axes;
        var skyBoxGeometry;
        var skyBoxMaterial;
        var skyBox;

        // set up dom ready callback
        $(onDomReady);

        // scene
        scene = new th.Scene();

        // camera
        camera = new th.PerspectiveCamera(viewAngle, aspect, near, far);
        // add the camera to the scene at the default position (0,0,0)
        scene.add(camera);
        // so pull it back
        camera.position.set(-300, 300, -300);
        // and set the angle towards the scene origin
        camera.lookAt(scene.position);

        // renderer
        if (Detector.webgl) {
            renderer = new th.WebGLRenderer({
                antialias: true
            });
        } else {
            renderer = new th.CanvasRenderer();
        }
        renderer.setSize(w, h);

        // container
        container = document.getElementById('container');
        // attach renderer to the container
        container.appendChild(renderer.domElement);

        // events
        // automatically resize renderer
        thx.WindowResize(renderer, camera);

        // controls
        controls = new th.TrackballControls(camera, renderer.domElement);

        // axes
        axes = new th.AxisHelper(200);
        scene.add(axes);

        // sky
        // ! make sure the camera's far is big enough to render the sky
        skyBoxGeometry = new th.BoxGeometry(10000, 10000, 10000);
        skyBoxMaterial = new th.MeshBasicMaterial({
            color: 0xffffff,
            side: th.BackSide
        });
        skyBox = new th.Mesh(skyBoxGeometry, skyBoxMaterial);
        scene.add(skyBox);

        setupShaderMaterial();

        drawSphere();

        drawCountriesToxi(raw.features);

        animate();
    };

    function onDomReady(){

    };

    function animate() {
        requestAnimationFrame(animate);
        render();
        update();
    };

    function update() {
        controls.update();
    };

    function render() {
        renderer.render(scene, camera);
    };

    function setupShaderMaterial(){
        var vShader = $('#vertexshader');
        var fShader = $('#fragmentshader');
        shaderMaterial =
            new THREE.ShaderMaterial({
                vertexShader:   vShader.text(),
                fragmentShader: fShader.text()
            });
    };

    function drawSphere(){
        var sphereGeometry = new th.SphereGeometry(radiusSphere, 64, 64);
        var sphereMesh = new th.Mesh(sphereGeometry, shaderMaterial);
        sphereMesh.position = new th.Vector3(0,0,0);
        scene.add(sphereMesh);
    };

    function drawCountries(countries){
        countries.forEach(function(feat){
            if(feat.geometry.type === 'Polygon'){
                drawCountry(feat.geometry.coordinates[0], 0xFF0000);
            }else { // multiple polygons
                feat.geometry.coordinates.forEach(function(poly){
                    drawCountry(poly[0], 0xFF0000);
                });
            }
        });
    };

    function drawCountriesToxi(countries){
        countries.forEach(function(feat){
            if(feat.geometry.type === 'Polygon'){
                var poly = coordToToxicPoly(feat.geometry.coordinates[0]);
                poly = createInsidePoints(poly);
                var points = poly.map(function(vec){
                    return latLong2Cart(vec.x, vec.y, radiusCountries);
                });
                drawCountryToxi(points, 0xFF0000);
            }else { // multiple polygons
                feat.geometry.coordinates.forEach(function(coords){
                    var poly = coordToToxicPoly(coords[0]);
                    poly = createInsidePoints(poly);
                    var points = poly.map(function(vec){
                        return latLong2Cart(vec.x, vec.y, radiusCountries);
                    });
                    drawCountryToxi(points, 0xFF0000);
                });
            }
        });
    };

    function coordToToxicPoly(coords){
        var poly = new toxi.geom.Polygon2D();
        coords.forEach(function(vert){
            var vec = new toxi.geom.Vec2D({
                x: vert[0],
                y: vert[1]
            });
            poly.add(vec);
        });
        return poly;
    };

    function createInsidePoints(poly){
        var bounds = poly.getBounds();
        var insidePoints = new Array();
        /*poly.vertices.forEach(function(vertex){
            insidePoints.push(vertex);
        });*/
        var step = 3;
        for(var i = parseInt(bounds.x); i <= parseInt(bounds.x + bounds.width +.5); i += step){
            for(var j = parseInt(bounds.y); j <= parseInt(bounds.y + bounds.height +.5); j += step){
                var currentVec = new toxi.geom.Vec2D({
                    x: i,
                    y: j
                });
                if(poly.containsPoint(currentVec)){
                    insidePoints.push(currentVec);
                }
            }
        }
        return insidePoints;
    };

    /**
     * @see https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Earth-LatLon.html
     * @param points
     * @param color
     */
    function drawCountry(points, color){
        var curvePath = createCurvePath(points);
        var lineGeometry = new THREE.Geometry();
        lineGeometry.vertices = curvePath.getPoints(500);
        lineGeometry.computeLineDistances();
        var lineMaterial = new THREE.LineBasicMaterial();
        lineMaterial.color = new THREE.Color(color);
        lineMaterial.linewidth = 2;
        var line = new THREE.Line( lineGeometry, lineMaterial );
        scene.add(line);
    };

    function drawCountry2(points, color){
        var curvePath = createCurvePath(points);
        var shape = new th.Shape(curvePath.getPoints(500));
        var shapeGeometry = new th.ShapeGeometry(shape);
        var shapeMaterial = new THREE.MeshLambertMaterial( { color: color } );
        shapeMaterial.side = th.DoubleSide;
        var mesh = new th.Mesh(shapeGeometry, shapeMaterial);
        scene.add(mesh);
    };


    /**
     * @see http://stackoverflow.com/questions/9252764/how-to-create-a-custom-mesh-on-three-js
     * @param points
     * @param color
     */
    function drawCountry3(points, color){
        var triangles, mesh;
        var holes = [];

        var curvePath = createCurvePath(points);
        var vertices = curvePath.getPoints(250);
        var geometry = new th.Geometry();
        var material = new th.MeshBasicMaterial( { color: color } );
        material.side = th.DoubleSide;

        geometry.vertices = vertices;
        triangles = th.Shape.Utils.triangulateShape ( vertices, holes );

        for( var i = 0; i < triangles.length; i++ ){
            geometry.faces.push( new th.Face3( triangles[i][0], triangles[i][1], triangles[i][2] ));
        }
        mesh = new th.Mesh( geometry, material );
        scene.add(mesh);

    };

    function drawCountryToxi(points, color){
        points.forEach(function(point){
            var material = new THREE.LineBasicMaterial({
                color: 0x0000ff
            });
            var geometry = new THREE.Geometry();
            geometry.vertices.push(
                new th.Vector3(0,9,9),
                point
            );
            var line = new THREE.Line( geometry, material );
            scene.add( line );
        });

    };

    /**
     * @see http://threejs.org/docs/#Reference/Extras.Core/CurvePath
     * @param points
     * @returns {THREE.CurvePath}
     */
    function createCurvePath(points){
        var curvePath = new th.CurvePath();
        var curve, pt1, pt2;
        for(var i = 0; i < points.length-1; i++){
            pt1 = latLong2Cart(points[i][0], points[i][1], radiusCountries);
            pt2 = latLong2Cart(points[i+1][0], points[i+1][1], radiusCountries);
            curve = createCurve(pt1, pt2);
            curvePath.add(curve);
        }
        curvePath.closePath();
        return curvePath;
    };


    /**
     * @see https://github.com/stemkoski/stemkoski.github.com/blob/master/Three.js/Earth-LatLon.html
     * @param pt1
     * @param pt2
     * @returns {THREE.Curve}
     */
    function createCurve(pt1, pt2){
        var sphereCurve = new th.Curve();
        var angle = pt1.angleTo(pt2);
        sphereCurve.getPoint = function(t){
            return new th.Vector3().addVectors(
                pt1.clone().multiplyScalar(Math.sin( (1 - t) * angle )),
                pt2.clone().multiplyScalar(Math.sin( t  * angle ))
            ).divideScalar( Math.sin(angle) );
        };
        return sphereCurve;
    };

    function latLong2Cart(lon, lat, r){
        lon = deg2Rad(lon);
        // -lat to display in the right side
        lat = deg2Rad(-lat);
        return  new th.Vector3( -r * Math.cos(lat) * Math.cos(lon),
            -r * Math.sin(lat),
            r * Math.cos(lat) * Math.sin(lon) );
    };

    function deg2Rad(x) {
        return 2 * Math.PI * x / 360;
    };

    $.getJSON('data/countries.geo.json').done(onSetup);

}(THREE, THREEx, jQuery, Detector, toxi, d3, window);
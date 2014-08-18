/**
 * Created by nicolasmondon on 16/08/2014.
 */
;!function(th, thx, $, Detector, win){

    var container, scene, camera, renderer;
    var controls;

    var radiusSphere = 100, radiusCountries = 100.1;

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
        camera.position.set(-600, 600, -600);
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
        controls = new th.OrbitControls(camera, renderer.domElement);

        // lights
        setupLight();

        // axes
        axes = new th.AxisHelper(100);
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

        drawSphere();

        drawCountries(raw.features);

        animate();
    };

    function onDomReady(){

    };

    // from http://stackoverflow.com/questions/15478093/realistic-lighting-sunlight-with-th-js
    function setupLight() {
        // lights
        var hemiLight = new th.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.position.set(0, 500, 0);

        var dirLight = new th.DirectionalLight(0xffffff, 0.6);
        dirLight.position.set(-1, 0.75, 1);
        dirLight.position.multiplyScalar(50);
        dirLight.name = 'dirlight';
        // dirLight.shadowCameraVisible = true;

        dirLight.castShadow = true;
        dirLight.shadowMapWidth = dirLight.shadowMapHeight = 1024 * 2;

        var d = 300;

        dirLight.shadowCameraLeft = -d;
        dirLight.shadowCameraRight = d;
        dirLight.shadowCameraTop = d;
        dirLight.shadowCameraBottom = -d;

        dirLight.shadowCameraFar = 3500;
        dirLight.shadowBias = -0.0001;
        dirLight.shadowDarkness = 0.35;

        scene.add(hemiLight);
        scene.add(dirLight);
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

    function drawSphere(){
        var sphereGeometry = new th.SphereGeometry(radiusSphere, 32, 32);
        var sphereMaterial = new th.MeshLambertMaterial({ color: new th.Color(0x0000CC) });
        var sphereMesh = new th.Mesh(sphereGeometry, sphereMaterial);
        sphereMesh.position = new th.Vector3(0,0,0);
        scene.add(sphereMesh);
    };

    function drawCountries(countries){
        countries.forEach(function(feat){
            if(feat.geometry.type === 'Polygon'){
                drawCountry(feat.geometry.coordinates[0], 0xFFFFFF);
            }else {
                feat.geometry.coordinates.forEach(function(poly){
                    drawCountry(poly[0], 0xFFFFFF);
                });
            }
        });
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
        lineMaterial.color = (typeof(color) === 'undefined') ? new THREE.Color(0xFF0000) : new THREE.Color(color);
        var line = new THREE.Line( lineGeometry, lineMaterial );
        scene.add(line);
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

}(THREE, THREEx, jQuery, Detector, window);
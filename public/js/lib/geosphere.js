/**
 * Created by nicolasmondon on 16/08/2014.
 */
;!function(th, thx, $, Detector, toxi, d3, Delaunay, _, queue, win, criterion){

    // data from http://data.undp.org/resource/7p2z-5b33.json

    var container, scene, camera, renderer;
    var controls;

    var radiusSphere = 100, radiusCountries = 101, radiusLine = 101.2;

    var shaderMaterial;

    var countryDatas;

    var maxCriterion, minCriterion, scaleCriterion;

    function onSetup(error, raw, dc, ll){

        // width
        var w = win.innerWidth;
        // height
        var h = win.innerHeight;
        var viewAngle = 40;
        var aspect = w / h;
        var near = 0.1;
        var far = 20000;
        var axes;

        countryDatas = dc.filter(function(d){
            return d.YEAR === '2012';
        });

        maxCriterion = d3.max(dc, function(d){
            return parseFloat(d[criterion]);
        });
        minCriterion = d3.min(dc, function(d){
            return parseFloat(d[criterion]);
        });
        scaleCriterion = d3.scale.linear()
            .domain([minCriterion, maxCriterion])
            .range([0,1]);

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

        setupLight();

        // axes
        axes = new th.AxisHelper(200);
        //scene.add(axes);

        // setupShaderMaterial();

        drawSphere();

        drawCountriesLine(raw.features);

        drawCountriesMesh(raw.features);

        drawCurves(ll);

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

    // from http://stackoverflow.com/questions/15478093/realistic-lighting-sunlight-with-th-js
    function setupLight() {
        // lights
        var hemiLight = new th.HemisphereLight(0xffffff, 0xffffff, 0.6);
        hemiLight.position.set(0, 500, 0);

        var dirLight = new th.DirectionalLight(0xffffff, 0.9);
        dirLight.position.set(-1, 0.75, 1);
        dirLight.position.multiplyScalar(50);
        dirLight.name = 'dirlight';
        //dirLight.shadowCameraVisible = true;

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

    function drawCurves(llDatas){
        llDatas.forEach(function(ll){
            var curve = createQuadraticCurve(ll[0], ll[1]);
            var lineGeometry = new THREE.Geometry();
            lineGeometry.vertices = curve.getPoints(200);
            lineGeometry.computeLineDistances();
            var lineMaterial = new THREE.LineBasicMaterial();
            lineMaterial.color = new THREE.Color(0x0FFFF0);
            lineMaterial.linewidth = 3;
            var line = new THREE.Line( lineGeometry, lineMaterial );
            scene.add(line);
        });

    };

    function drawSphere(){
        var sphereGeometry = new th.SphereGeometry(radiusSphere, 64, 64);
        var sphereMesh = new th.Mesh(sphereGeometry, new th.MeshLambertMaterial({ color: 0x6666FF }));
        sphereMesh.position = new th.Vector3(0,0,0);
        scene.add(sphereMesh);

        var increment = 3;
        var outlineMaterial = new th.MeshLambertMaterial({ color: 0xDDDDEE, side: th.BackSide });
        var outlineGeometry = new th.SphereGeometry(
            radiusSphere + increment, 64 + increment, 64 + increment
            );
        var outlineMesh = new th.Mesh(outlineGeometry, outlineMaterial);
        outlineMesh.position = new th.Vector3(0,0,0);
        scene.add(outlineMesh);
    };

    function drawCountriesLine(countries){
        countries.forEach(function(feat){
            if(feat.geometry.type === 'Polygon'){
                drawCountryLine(feat.geometry.coordinates[0], 0x00FF00);
            }else { // multiple polygons
                feat.geometry.coordinates.forEach(function(poly){
                    drawCountryLine(poly[0], 0x00FF00);
                });
            }
        });
    };

    function drawCountriesMesh(countries){
        countries.forEach(function(feat, i){
            if(feat.geometry.type === 'Polygon'){
                computeContry(feat.geometry.coordinates[0], feat.id);
            }else { // multiple polygons
                feat.geometry.coordinates.forEach(function(coords){
                    computeContry(coords[0], feat.id);
                });
            }
        });
    };

    function computeContry(coords, id){
        var poly = coordToToxicPoly(coords);
        var vecs = createInsidePoints(poly);
        // thx https://github.com/ironwallaby/delaunay
        var delaunayTriangulation = Delaunay.triangulate(
            vecs.map(function(vec){
                return [vec.x, vec.y];
            })
        );
        var triangles = [];
        for(var i=0; i<delaunayTriangulation.length -2; i+=3){
            triangles.push([
                delaunayTriangulation[i],
                delaunayTriangulation[i+1],
                delaunayTriangulation[i+2]
            ]);
        }
        // remove convexe faces
        triangles = _.remove(triangles, function(tr){
            var centre = new toxi.geom.Vec2D({
                x: d3.mean(tr, function(t){ return vecs[t].x; }),
                y: d3.mean(tr, function(t){ return vecs[t].y; })
            });
            return poly.containsPoint(centre);
        });

        var points = vecs.map(function(vec){
            return latLong2Cart(vec.x, vec.y, radiusCountries);
        });
        if(triangles.length && triangles.length > 0
            && points.length && points.length > 2){
            drawCountryMesh(points, triangles, getColorByCriterion(id));
        }
    };

    function getColorByCriterion(id){

        var currentCountry = _.find(countryDatas, function(cd){
            return id === cd.COUNTRY;
        });

        if(typeof(currentCountry) !== 'undefined'){
            return new th.Color(
                scaleCriterion(parseFloat(currentCountry[criterion]))
                , 0
                , 0);
        }
        else {
            return new th.Color(0,0,0);
        }

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
        poly.vertices.forEach(function(vertex, i){
            insidePoints.push(vertex);
        });
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
    function drawCountryLine(points, color){
        var curvePath = createCurvePath(points);
        var lineGeometry = new THREE.Geometry();
        lineGeometry.vertices = curvePath.getPoints(500);
        lineGeometry.computeLineDistances();
        var lineMaterial = new THREE.LineBasicMaterial();
        lineMaterial.color = new THREE.Color(color);
        lineMaterial.linewidth = 1;
        var line = new THREE.Line( lineGeometry, lineMaterial );
        scene.add(line);
    };


    function drawCountryMesh(points, triangles, color){
        var mesh;
        var geometry = new th.Geometry();
        var material = new th.MeshBasicMaterial( {
            color: color
        } );
        material.side = th.DoubleSide;
        geometry.vertices = points;

        triangles.forEach(function(tr){
            geometry.faces.push( new th.Face3(tr[0],tr[1],tr[2]) );
        });

        mesh = new th.Mesh( geometry, material );
        scene.add(mesh);
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
            pt1 = latLong2Cart(points[i][0], points[i][1], radiusLine);
            pt2 = latLong2Cart(points[i+1][0], points[i+1][1], radiusLine);
            curve = createCurve(pt1, pt2);
            curvePath.add(curve);
        }
        curvePath.closePath();
        return curvePath;
    };

    function createQuadraticCurve(pt1, pt2){
        var curvePath = new th.CurvePath();
        var quadCurve = new th.QuadraticBezierCurve3(
            latLong2Cart(pt1[0], pt1[1], radiusCountries),
            latLong2Cart((pt1[0] + pt2[0]) / 2, (pt1[1] + pt2[1]) / 2, radiusCountries * 1.25),
            latLong2Cart(pt2[0], pt2[1], radiusCountries)
        );
        curvePath.add(quadCurve);
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

    queue()
        .defer(d3.json, 'data/countries.geo.json')
        .defer(d3.csv, 'data/life_expectancy.csv')
        .defer(d3.json, 'data/latlong.json')
        .await(onSetup);


    // $.getJSON('data/countries.geo.json').done(onSetup);

}(THREE, THREEx, jQuery, Detector, toxi, d3, Delaunay, _, queue, window, 'Numeric');
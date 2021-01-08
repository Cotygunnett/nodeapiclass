const ErrorResponse = require('../utils/errorResponse');
const Bootcamp = require('../models/Bootcamp');
const geocoder = require('../utils/geocoder');
const asyncHandler = require('../middleware/async');

// @desc   Get all bootcamps
// @route  GET /api/v1/bootcamps
// @access Public
exports.getBootcamps = asyncHandler(async (req, res, next) => {
        let query;
        
        //copy req.query
        const reqQuery = { ...req.query };

        //fields to exclude
        const removeFields = ['select', 'sort', 'page', 'limit'];

       

        //loop over removed fields and delete them from query
        removeFields.forEach(param => delete reqQuery[param]);

         //create query string
         let queryStr = JSON.stringify(reqQuery);


        //create operators 
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in)\b/g, match => `$${match}`);

        //finding resource 
        query = Bootcamp.find(JSON.parse(queryStr));

        // select fields
        if(req.query.select){
            const fields = req.query.select.split(',').join(' ');
            query = query.select(fields);
    
        };

        //sort
        if(req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        } else {
            query = query.sort('-createdAt');
        
        };

        //pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 25;
        const startIndex = (page - 1)* limit;
        const endIndex = page*limit;
        const total = await Bootcamp.countDocuments();



        query = query.skip(startIndex).limit(limit);

        //executing query
        const bootcamps = await query;
        
        //pagination result
        const pagination = {};

        if(endIndex < total) {
            pagination.next = {
                page: page + 1,
                limit
            }
        }
    
        if(startIndex) {
            pagination.prev = {
                page: page - 1,
                limit
            }
        }
        res.status(200).json({success: true, count: bootcamps.length, pagination, data: bootcamps});
});

// @desc   Get single bootcamps
// @route  GET /api/v1/bootcamps/:id
// @access Public
exports.getBootcamp = asyncHandler(async (req, res, next) => {
  
    const bootcamp = await Bootcamp.findById(req.params.id); 

    if(!bootcamp) {
       return next(
           new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`, 404)
           );
    }

    res.status(200).json({success: true, data: bootcamp});

 
});

// @desc   create new bootcamp
// @route  POST /api/v1/bootcamps
// @access Private
exports.createBootcamp = asyncHandler(async (req, res, next) => {

        const bootcamp = await Bootcamp.create(req.body);
        
        res.status(201).json({
            success: true,
            data: bootcamp,
        })
 

});


// @desc   update bootcamp
// @route  PUT /api/v1/bootcamps
// @access Private
exports.updateBootcamp = asyncHandler(async (req, res, next) => {

   
        const bootcamp = await Bootcamp.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
    
        if(!bootcamp) {
            return next(
                new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`, 404)
                );    
        }
        res.status(200).json({success: true, data: bootcamp});

  

    

});

// @desc   delete bootcamp
// @route  GET /api/v1/bootcamps/:id
// @access Private
exports.deleteBootcamp = asyncHandler(async (req, res, next) => {

        const bootcamp = await Bootcamp.findByIdAndDelete(req.params.id);
    
        if(!bootcamp) {
            return next(
                new ErrorResponse(`Bootcamp not found with the id of ${req.params.id}`, 404)
                );        }

        res.status(200).json({success: true, data: {} });
   
});



// @desc   get bootcamps within a radius
// @route  GET /api/v1/bootcamps/radius/:zipcode/:distance
// @access Private
exports.getBootcampsInRadius = asyncHandler(async (req, res, next) => {
    const {zipcode, distance } = req.params;
    
    //get lat and long from geocoder
    const loc = await geocoder.geocode(zipcode);
    const lat = loc[0].latitude;
    const lng = loc[0].longitude

    //calc radius using radians
    // divide distace by radius of the earth
    // earth radius = 3,963 mi / 6378 km
    const radius = distance / 3963;

    const bootcamps = await Bootcamp.find({
        location: { $geoWithin: { $centerSphere: [ [ lng, lat ], radius ] }}
    });

    res.status(200).json({
        success: true,
        count: bootcamps.length,
        data: bootcamps
    });
});

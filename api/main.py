
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="California Housing API")

MODEL_PATH = Path(__file__).resolve().parent / "housing_model.joblib"
model = joblib.load(MODEL_PATH)


class HousingInput(BaseModel):
    MedInc: float = Field(gt=0)
    HouseAge: float = Field(ge=0)
    AveRooms: float = Field(gt=0)
    AveBedrms: float = Field(ge=0)
    Population: float = Field(ge=0)
    AveOccup: float = Field(gt=0)
    Latitude: float = Field(ge=-90, le=90)
    Longitude: float = Field(ge=-180, le=180)


@app.get("/")
def home():
    return {"message": "California Housing API is running"}


@app.post("/predict")
def predict(data: HousingInput):
    features = pd.DataFrame(
        [data.model_dump()],
        columns=list(model.feature_names_in_)
    )

    prediction = model.predict(features)[0]

    return {
        "predicted_value_usd": round(float(prediction) * 100_000, 2)
    }
